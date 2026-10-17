# SkillBridge local API test suite (run against http://127.0.0.1:8787)
# Covers: auth, marketplace, team jobs (positions), quotes per position,
# hiring, mentor, milestones, updates visibility, delivery, reviews both ways,
# admin, chat access control, AI brief.
param([string]$Base = "http://127.0.0.1:8787")

$ErrorActionPreference = "Stop"
$script:pass = 0
$script:fail = 0

function Assert($name, $condition) {
  if ($condition) { $script:pass++; Write-Host "  PASS  $name" -ForegroundColor Green }
  else { $script:fail++; Write-Host "  FAIL  $name" -ForegroundColor Red }
}

function Call($method, $path, $body = $null, $token = $null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{ Uri = "$Base$path"; Method = $method; Headers = $headers; UseBasicParsing = $true; TimeoutSec = 20 }
  if ($null -ne $body) {
    $params["ContentType"] = "application/json"
    $params["Body"] = ($body | ConvertTo-Json -Depth 10)
  }
  try {
    $res = Invoke-WebRequest @params
    $json = $null
    try { $json = $res.Content | ConvertFrom-Json } catch { $json = $null }
    return @{ status = [int]$res.StatusCode; json = $json; ok = $true }
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    $msg = ""
    try { $msg = $_.ErrorDetails.Message } catch {}
    return @{ status = $status; json = $null; error = $msg; ok = $false }
  }
}

Write-Host "`n=== 1. Health + logins ==="
$r = Call GET "/api/health"
Assert "health ok" ($r.ok -and $r.json.ok -eq $true)

$admin = Call POST "/api/auth/login" @{ email = "admin@demo.com"; password = "admin12345" }
Assert "admin login" ($admin.status -eq 200)
$adminToken = $admin.json.token

$rajesh = Call POST "/api/auth/login" @{ email = "rajesh@demo.com"; password = "demo12345" }
$rajeshToken = $rajesh.json.token
$priya = Call POST "/api/auth/login" @{ email = "priya@demo.com"; password = "demo12345" }
$priyaToken = $priya.json.token
$arjun = Call POST "/api/auth/login" @{ email = "arjun@demo.com"; password = "demo12345" }
$arjunToken = $arjun.json.token
$neha = Call POST "/api/auth/login" @{ email = "neha@demo.com"; password = "demo12345" }
$nehaToken = $neha.json.token
$mentor = Call POST "/api/auth/login" @{ email = "mentor@demo.com"; password = "mentor12345" }
$mentorToken = $mentor.json.token
$meera = Call POST "/api/auth/login" @{ email = "meera@demo.com"; password = "mentor12345" }
$meeraToken = $meera.json.token
Assert "logins" ($rajesh.ok -and $priya.ok -and $arjun.ok -and $neha.ok -and $mentor.ok -and $meera.ok)

Write-Host "`n=== 2. Marketplace shows only open jobs ==="
$market = Call GET "/api/jobs" $null $priyaToken
$statuses = @($market.json | ForEach-Object { $_.status } | Sort-Object -Unique)
Assert "portal lists only open jobs" (($statuses.Count -eq 1) -and ($statuses -contains "open"))
Assert "seeded team job open (job-001)" ($market.json | Where-Object { $_.id -eq "job-001" })
Assert "in-progress job-005 hidden from portal" (-not ($market.json | Where-Object { $_.id -eq "job-005" }))
$j1 = $market.json | Where-Object { $_.id -eq "job-001" }
Assert "positionFill exposed" ($j1.positionFill.Count -eq 3)
Assert "myApplication flag exposed (priya applied in seed)" ($j1.myApplication -and $j1.myApplication.status -eq "pending")
$rajMarket = Call GET "/api/jobs" $null $rajeshToken
Assert "owner's own jobs excluded from feed" (-not ($rajMarket.json | Where-Object { $_.id -eq "job-001" }))

Write-Host "`n=== 3. Post team job + publish ==="
$newJob = Call POST "/api/jobs" @{
  title = "Test team job: store promotion campaign"
  description = "Festival promotion campaign needing marketers, a designer and a content person."
  category = "Marketing"
  requiredSkills = @("Canva", "Copywriting")
  positions = @(@{ title = "Marketing"; count = 2 }, @{ title = "Designer"; count = 1 })
  budgetMin = 10000
  budgetMax = 18000
  deadline = "2026-11-25"
  milestones = @(@{ title = "Concept"; dueDate = "2026-11-05" }, @{ title = "Final handover"; dueDate = "2026-11-25" })
} $rajeshToken
Assert "create team job" ($newJob.status -eq 201)
$jobId = $newJob.json.id
Assert "positions parsed" ($newJob.json.positions.Count -eq 2 -and $newJob.json.positions[0].count -eq 2)

$pub = Call PATCH "/api/jobs/$jobId/publish" $null $rajeshToken
Assert "publish" ($pub.status -eq 200)

Write-Host "`n=== 3b. Simple job (no positions) -> default Freelancer slot ==="
$simpleJob = Call POST "/api/jobs" @{
  title = "Test simple job: logo refresh"
  description = "Refresh our shop logo with a cleaner, modern look and hand over print-ready files."
  category = "Design"
  requiredSkills = @("Logo Design")
  budgetMin = 2000
  budgetMax = 3000
} $rajeshToken
Assert "create simple job" ($simpleJob.status -eq 201)
$simpleJobId = $simpleJob.json.id
Assert "default Freelancer position" ($simpleJob.json.positions.Count -eq 1 -and $simpleJob.json.positions[0].title -eq "Freelancer" -and $simpleJob.json.positions[0].count -eq 1)

$editJob = Call PATCH "/api/jobs/$simpleJobId" @{ title = "Test simple job: logo refresh (edited)"; budgetMax = 3500 } $rajeshToken
Assert "owner edits job details" ($editJob.status -eq 200 -and $editJob.json.title -eq "Test simple job: logo refresh (edited)" -and $editJob.json.budgetMax -eq 3500)
$editJobForbidden = Call PATCH "/api/jobs/$simpleJobId" @{ title = "hijack" } $priyaToken
Assert "non-owner cannot edit job" ($editJobForbidden.status -eq 403)

$null = Call PATCH "/api/jobs/$simpleJobId/publish" $null $rajeshToken
$sq = Call POST "/api/applications/$simpleJobId/apply" @{ positionId = $simpleJob.json.positions[0].id; pitch = "I have refreshed logos for 5 local shops and can deliver this week."; quoteAmount = 2500 } $arjunToken
Assert "quote on simple job" ($sq.status -eq 201)
$sapps = Call GET "/api/applications/$simpleJobId/applications" $null $rajeshToken
$saccept = Call POST "/api/applications/$($sapps.json.applications[0].id)/accept" $null $rajeshToken
Assert "single hire completes team -> auto-starts work" ($saccept.status -eq 200 -and $saccept.json.teamComplete -eq $true)
$sdetail = Call GET "/api/jobs/$simpleJobId" $null $rajeshToken
Assert "simple job in_progress immediately" ($sdetail.json.status -eq "in_progress")

$editLocked = Call PATCH "/api/jobs/$simpleJobId" @{ title = "too late" } $rajeshToken
Assert "in-progress job details locked" ($editLocked.status -eq 400)

Write-Host "`n=== 4. Quotes per position ==="
$q1 = Call POST "/api/applications/$jobId/apply" @{ positionId = $newJob.json.positions[0].id; pitch = "I can lead the campaign and coordinate the marketing side of the team."; quoteAmount = 7000 } $priyaToken
Assert "priya quotes Marketing" ($q1.status -eq 201)
$q2 = Call POST "/api/applications/$jobId/apply" @{ positionId = $newJob.json.positions[0].id; pitch = "Marketing is my focus; happy to run the calendar and analytics."; quoteAmount = 7500 } $arjunToken
Assert "arjun quotes Marketing" ($q2.status -eq 201)
$q3 = Call POST "/api/applications/$jobId/apply" @{ positionId = $newJob.json.positions[1].id; pitch = "I design posters and social graphics; portfolio in profile."; quoteAmount = 5000 } $nehaToken
Assert "neha quotes Designer" ($q3.status -eq 201)
$qBad = Call POST "/api/applications/$jobId/apply" @{ positionId = "nonexistent"; pitch = "This position does not exist and should fail."; quoteAmount = 100 } $nehaToken
Assert "bad position rejected" ($qBad.status -eq 400)
$qDup = Call POST "/api/applications/$jobId/apply" @{ positionId = $newJob.json.positions[0].id; pitch = "Duplicate quote for the same position should fail."; quoteAmount = 8000 } $priyaToken
Assert "duplicate position quote rejected" ($qDup.status -eq 409)

$qApps = Call GET "/api/applications/$jobId/applications" $null $rajeshToken
$priyaQuoteId = ($qApps.json.applications | Where-Object { $_.applicantId -eq $priya.json.user.id }).id
$editQuote = Call PATCH "/api/applications/$priyaQuoteId" @{ pitch = "Updated pitch: I can also handle the analytics dashboard for the campaign."; quoteAmount = 7200 } $priyaToken
Assert "applicant edits own quote" ($editQuote.status -eq 200 -and $editQuote.json.quoteAmount -eq 7200)
$qApps2 = Call GET "/api/applications/$jobId/applications" $null $rajeshToken
$priyaQuote2 = $qApps2.json.applications | Where-Object { $_.applicantId -eq $priya.json.user.id }
Assert "edited quote visible to owner" ($priyaQuote2.quoteAmount -eq 7200 -and $priyaQuote2.pitch -like "*Updated pitch*")
$editQuoteOthers = Call PATCH "/api/applications/$priyaQuoteId" @{ pitch = "Hijack attempt by another user should fail."; quoteAmount = 1 } $arjunToken
Assert "other applicant cannot edit quote" ($editQuoteOthers.status -eq 403)

Write-Host "`n=== 5. Hiring builds the team ==="
$apps = Call GET "/api/applications/$jobId/applications" $null $rajeshToken
Assert "owner sees grouped quote payload" ($apps.ok -and $apps.json.applications.Count -eq 3 -and $apps.json.team.Count -eq 0)
$priyaApp = ($apps.json.applications | Where-Object { $_.applicantId -eq $priya.json.user.id })
$arjunApp = ($apps.json.applications | Where-Object { $_.applicantId -eq $arjun.json.user.id })
$nehaApp  = ($apps.json.applications | Where-Object { $_.applicantId -eq $neha.json.user.id })

$h1 = Call POST "/api/applications/$($priyaApp.id)/accept" $null $rajeshToken
Assert "hire priya (position not full yet)" ($h1.status -eq 200 -and $h1.json.teamComplete -eq $false)
$detail = Call GET "/api/jobs/$jobId" $null $rajeshToken
Assert "still open after partial fill" ($detail.json.status -eq "open")
$priyaFeed = Call GET "/api/jobs?status=open" $null $priyaToken
Assert "hired member's job excluded from their feed" (-not ($priyaFeed.json | Where-Object { $_.id -eq $jobId }))
$nehaFeed = Call GET "/api/jobs?status=open" $null $nehaToken
Assert "unfilled job still visible to other students" ($nehaFeed.json | Where-Object { $_.id -eq $jobId })
$teamApply = Call POST "/api/applications/$jobId/apply" @{ positionId = $newJob.json.positions[1].id; pitch = "I am already on this team and should be blocked from applying again."; quoteAmount = 4000 } $priyaToken
Assert "team member blocked from re-applying" ($teamApply.status -eq 400)

$h2 = Call POST "/api/applications/$($arjunApp.id)/accept" $null $rajeshToken
Assert "hire arjun (marketing now full)" ($h2.status -eq 200 -and $h2.json.teamComplete -eq $false)

$overflow = Call POST "/api/applications/$jobId/apply" @{ positionId = $newJob.json.positions[0].id; pitch = "This should fail because Marketing is already full."; quoteAmount = 6900 } $nehaToken
Assert "full position blocks new quotes" ($overflow.status -eq 400)

$h3 = Call POST "/api/applications/$($nehaApp.id)/accept" $null $rajeshToken
Assert "hire neha -> team complete -> work starts" ($h3.status -eq 200 -and $h3.json.teamComplete -eq $true)

$detail = Call GET "/api/jobs/$jobId" $null $rajeshToken
Assert "status=in_progress (auto-start)" ($detail.json.status -eq "in_progress")
Assert "team has 3 members" ($detail.json.team.Count -eq 3)
$portal = Call GET "/api/jobs" $null $priyaToken
Assert "awarded job delisted from portal" (-not ($portal.json | Where-Object { $_.id -eq $jobId }))

Write-Host "`n=== 6. Mentor + team work flow ==="
$claim = Call POST "/api/mentor/jobs/$jobId/claim" $null $mentorToken
Assert "mentor claims" ($claim.status -eq 200)
$release = Call POST "/api/mentor/jobs/$jobId/release" $null $mentorToken
Assert "mentor frees himself" ($release.status -eq 200)
$queueAgain = Call GET "/api/mentor/queue" $null $mentorToken
Assert "job back in mentor queue" ($queueAgain.json | Where-Object { $_.id -eq $jobId })
$claim2 = Call POST "/api/mentor/jobs/$jobId/claim" $null $mentorToken
Assert "mentor re-claims" ($claim2.status -eq 200)

$detail = Call GET "/api/jobs/$jobId" $null $priyaToken
$msId = $detail.json.milestones[0].id
$sub = Call POST "/api/milestones/$msId/submit" @{ content = "Concept ready - team drafted the campaign calendar." } $arjunToken
Assert "team member submits milestone" ($sub.status -eq 200)
$approve = Call POST "/api/milestones/$msId/approve" $null $mentorToken
Assert "mentor approves" ($approve.status -eq 200)

$outsider = Call POST "/api/auth/login" @{ email = "vikram@demo.com"; password = "demo12345" }
$forbidden = Call GET "/api/jobs/$jobId/updates" $null $outsider.json.token
Assert "outsider cannot read progress updates" ($forbidden.status -eq 403)
$visible = Call GET "/api/jobs/$jobId/updates" $null $nehaToken
Assert "team member reads updates" ($visible.ok -and $visible.json.Count -ge 4)

$deliver = Call POST "/api/jobs/$jobId/deliver" @{ content = "Campaign delivered: posts, designs and content ready." } $priyaToken
Assert "team member delivers" ($deliver.status -eq 200)
$finish = Call POST "/api/jobs/$jobId/accept" $null $rajeshToken
Assert "owner accepts -> completed" ($finish.status -eq 200)

Write-Host "`n=== 7. Reviews (owner x each member, member x owner) ==="
$r1 = Call POST "/api/reviews/jobs/$jobId/review" @{ revieweeId = $priya.json.user.id; rating = 5; comment = "Led the marketing side really well." } $rajeshToken
Assert "owner reviews priya" ($r1.status -eq 201)
$r2 = Call POST "/api/reviews/jobs/$jobId/review" @{ revieweeId = $arjun.json.user.id; rating = 4; comment = "Solid calendar and analytics." } $rajeshToken
Assert "owner reviews arjun" ($r2.status -eq 201)
$r3 = Call POST "/api/reviews/jobs/$jobId/review" @{ revieweeId = $neha.json.user.id; rating = 5; comment = "Great designs, quick turnaround." } $rajeshToken
Assert "owner reviews neha" ($r3.status -eq 201)
$r4 = Call POST "/api/reviews/jobs/$jobId/review" @{ revieweeId = $rajesh.json.user.id; rating = 4; comment = "Clear brief, prompt feedback." } $priyaToken
Assert "team member reviews owner" ($r4.status -eq 201)
$badRev = Call POST "/api/reviews/jobs/$jobId/review" @{ revieweeId = $neha.json.user.id; rating = 3 } $priyaToken
Assert "member cannot review member" ($badRev.status -eq 400)
$dupRev = Call POST "/api/reviews/jobs/$jobId/review" @{ revieweeId = $priya.json.user.id; rating = 4 } $rajeshToken
Assert "duplicate pair review blocked" ($dupRev.status -eq 409)

Write-Host "`n=== 8. Public profiles ==="
$pub = Call GET "/api/users/$($priya.json.user.id)" $null $rajeshToken
Assert "profile has stats" ($pub.ok -and $pub.json.stats.jobsCompleted -ge 2)
Assert "profile lists completed jobs" ($pub.json.jobsCompleted.Count -ge 2)
Assert "profile has links" ($pub.json.profile.linkedin -and $pub.json.profile.github)
$mentorPub = Call GET "/api/users/mentor-001" $null $rajeshToken
Assert "mentor profile visible" ($mentorPub.ok -and $mentorPub.json.mentor.expertise.Count -ge 1)
Assert "mentor jobsMentored stat" ($mentorPub.json.stats.jobsMentored -ge 1)

Write-Host "`n=== 9. Admin ==="
$stats = Call GET "/api/admin/stats" $null $adminToken
Assert "stats" ($stats.ok -and $stats.json.jobs -ge 8)
$newMentorEmail = "testmentor$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@demo.com"
$newMentor = Call POST "/api/admin/mentors" @{ name = "Test Mentor"; email = $newMentorEmail; password = "password123"; expertise = @("Design") } $adminToken
Assert "admin creates mentor" ($newMentor.status -eq 201)
$mentorLogin = Call POST "/api/auth/login" @{ email = $newMentorEmail; password = "password123" }
Assert "new mentor can login" ($mentorLogin.status -eq 200 -and $mentorLogin.json.user.role -eq "mentor")
$blockMentor = Call PATCH "/api/admin/mentors/$($mentorLogin.json.user.id)/block" $null $adminToken
Assert "block mentor" ($blockMentor.status -eq 200)
$blockedLogin = Call POST "/api/auth/login" @{ email = $newMentorEmail; password = "password123" }
Assert "blocked mentor cannot login" ($blockedLogin.status -eq 403)
$unblockMentor = Call PATCH "/api/admin/mentors/$($mentorLogin.json.user.id)/unblock" $null $adminToken
Assert "unblock mentor" ($unblockMentor.status -eq 200)
$delMentor = Call DELETE "/api/admin/mentors/$($mentorLogin.json.user.id)" $null $adminToken
Assert "admin removes mentor" ($delMentor.status -eq 200)
$mentorLogin2 = Call POST "/api/auth/login" @{ email = $newMentorEmail; password = "password123" }
Assert "removed mentor cannot login" ($mentorLogin2.status -eq 401)

$reassign = Call PATCH "/api/admin/jobs/$jobId/mentor" @{ mentorId = "mentor-002" } $adminToken
Assert "admin reassigns mentor" ($reassign.status -eq 200)
$meeraJob = Call GET "/api/mentor/jobs/$jobId" $null $meeraToken
Assert "new mentor sees the job" ($meeraJob.status -eq 200)
$clearMentor = Call PATCH "/api/admin/jobs/$jobId/mentor" @{ mentorId = $null } $adminToken
Assert "admin clears mentor" ($clearMentor.status -eq 200)
$null = Call PATCH "/api/admin/jobs/$jobId/mentor" @{ mentorId = "mentor-001" } $adminToken

$free = Call POST "/api/admin/jobs/job-008/remove-member" @{ userId = "user-006" } $adminToken
Assert "admin frees student from job" ($free.status -eq 200)
$job8 = Call GET "/api/jobs/job-008" $null $adminToken
Assert "freed job back to open" ($job8.json.status -eq "open")
$nehaFeed2 = Call GET "/api/jobs" $null $nehaToken
Assert "freed job visible in public listings again" ($nehaFeed2.json | Where-Object { $_.id -eq "job-008" })

$ownerEmail = "owner$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@demo.com"
$newOwner = Call POST "/api/admin/businesses" @{ name = "Test Owner"; email = $ownerEmail; password = "password123"; businessName = "Test Traders"; sector = "Retail"; city = "Pune" } $adminToken
Assert "admin creates business owner" ($newOwner.status -eq 201)
$ownerLogin = Call POST "/api/auth/login" @{ email = $ownerEmail; password = "password123" }
Assert "new owner can login" ($ownerLogin.status -eq 200 -and $ownerLogin.json.user.role -eq "user")
$ownerPub = Call GET "/api/users/$($ownerLogin.json.user.id)" $null $rajeshToken
Assert "owner profile shows business" ($ownerPub.json.business.businessName -eq "Test Traders")
$delOwner = Call DELETE "/api/admin/users/$($ownerLogin.json.user.id)" $null $adminToken
Assert "admin removes business owner" ($delOwner.status -eq 200)
$ownerLogin2 = Call POST "/api/auth/login" @{ email = $ownerEmail; password = "password123" }
Assert "removed owner cannot login" ($ownerLogin2.status -eq 401)
$blockUser = Call PATCH "/api/admin/users/$($arjun.json.user.id)/block" $null $adminToken
Assert "block user" ($blockUser.status -eq 200)
$blockedReq = Call GET "/api/profile/me" $null $arjunToken
Assert "blocked user rejected" ($blockedReq.status -eq 403)
$null = Call PATCH "/api/admin/users/$($arjun.json.user.id)/unblock" $null $adminToken
$delistCompleted = Call PATCH "/api/admin/jobs/$jobId/delist" $null $adminToken
Assert "completed job cannot be delisted back into the pool" ($delistCompleted.status -eq 400)
$delist = Call PATCH "/api/admin/jobs/job-002/delist" $null $adminToken
Assert "delist open job" ($delist.status -eq 200)
$null = Call PATCH "/api/admin/jobs/job-002/relist" $null $adminToken
$relisted = Call GET "/api/jobs" $null $priyaToken
Assert "relisted job returns to open feed" ($relisted.json | Where-Object { $_.id -eq "job-002" })

Write-Host "`n=== 10. Group chat access ==="
$send = Call POST "/api/chat/$jobId/messages" @{ text = "Group chat hello from the owner!" } $rajeshToken
Assert "owner sends" ($send.ok)
$priyaSees = Call GET "/api/chat/$jobId/messages" $null $priyaToken
$arjunSees = Call GET "/api/chat/$jobId/messages" $null $arjunToken
$mentorSees = Call GET "/api/chat/$jobId/messages" $null $mentorToken
Assert "all team members + mentor see group chat" ($priyaSees.ok -and $arjunSees.ok -and $mentorSees.ok)
Assert "message shape camelCase (senderName/createdAt)" ($priyaSees.json.messages.Count -ge 1 -and $priyaSees.json.messages[0].senderName -and $priyaSees.json.messages[0].createdAt)
$mentorRoom = Call GET "/api/chat/$jobId/messages?scope=mentor" $null $mentorToken
Assert "mentor room accessible to mentor" ($mentorRoom.status -eq 200)
$mentorRoomTeam = Call GET "/api/chat/$jobId/messages?scope=mentor" $null $priyaToken
Assert "team member in mentor room" ($mentorRoomTeam.status -eq 200)
$mentorRoomOwner = Call GET "/api/chat/$jobId/messages?scope=mentor" $null $rajeshToken
Assert "owner excluded from private mentor room" ($mentorRoomOwner.status -eq 403)
$sendMentorRoom = Call POST "/api/chat/$jobId/messages?scope=mentor" @{ text = "Private note from mentor" } $mentorToken
Assert "mentor sends in private room" ($sendMentorRoom.status -eq 200)
$roomsMentor = Call GET "/api/chat/rooms" $null $mentorToken
Assert "mentor rooms include both scopes" ((($roomsMentor.json | Where-Object { $_.jobId -eq $jobId }).scope | Sort-Object -Unique) -contains "mentor")
$outsiderChat = Call GET "/api/chat/$jobId/messages" $null $outsider.json.token
Assert "outsider blocked" ($outsiderChat.status -eq 403)
$rooms = Call GET "/api/chat/rooms" $null $priyaToken
$room = $rooms.json | Where-Object { $_.jobId -eq $jobId -and $_.scope -eq "group" }
Assert "room lists team + mentor" ($room.teamNames.Count -eq 3 -and $room.mentorName -eq "Dr. Anil Gupta")

Write-Host "`n=== 11. AI brief + assistant chat ==="
$brief = Call POST "/api/ai/project-brief" @{ description = "We need a poster for our annual sale with festive themes and our logo."; language = "en" } $rajeshToken
Assert "ai brief" ($brief.status -eq 200 -and $brief.json.title)

$aiOwner = Call POST "/api/ai/chat" @{ mode = "owner"; message = "I run a small bakery and want more Diwali orders. What should I post?"; history = @(@{ role = "user"; content = "I want to grow my bakery sales." }) } $rajeshToken
Assert "ai chat owner mode" ($aiOwner.status -eq 200 -and $aiOwner.json.reply.Length -gt 20)

$aiStudent = Call POST "/api/ai/chat" @{ mode = "student"; jobId = "job-001"; message = "What is this job actually asking for, and what should my quote cover?" } $priyaToken
Assert "ai chat student mode (job context)" ($aiStudent.status -eq 200 -and $aiStudent.json.reply.Length -gt 20)

$aiBadMode = Call POST "/api/ai/chat" @{ mode = "hacker"; message = "x" } $priyaToken
Assert "ai chat rejects bad mode" ($aiBadMode.status -eq 400)

$aiNoAuth = Call POST "/api/ai/chat" @{ mode = "owner"; message = "Should be blocked without auth." } $null
Assert "ai chat requires auth" ($aiNoAuth.status -eq 401)

Write-Host "`n=== 12. GitHub code-review agent (mock mode) ==="
$connect = Call POST "/api/ai/github/repos" @{ owner = "testorg"; repo = "testrepo"; token = "ghp_mocktoken123456789" } $rajeshToken
Assert "connect repo" ($connect.status -eq 201)
$repoId = $connect.json.id

$reposList = Call GET "/api/ai/github/repos" $null $rajeshToken
Assert "repos listed" ($reposList.ok -and $reposList.json.Count -eq 1 -and $reposList.json[0].owner -eq "testorg")
Assert "token not leaked" (-not ($reposList.json[0].PSObject.Properties.Name -contains "tokenEnc") -and $reposList.Content -notmatch "ghp_mock")

$review = Call POST "/api/ai/github/repos/$repoId/review" $null $rajeshToken
Assert "review now runs" ($review.status -eq 200 -and $review.json.status -eq "done")
Assert "review has sha/rating/findings/comment" ($review.json.commitSha -and $review.json.rating -ge 1 -and $review.json.rating -le 5 -and $review.json.findings -is [System.Array] -and $review.json.commentUrl)
Assert "review summary non-empty" ($review.json.summary.Length -gt 10)

$runs = Call GET "/api/ai/github/repos/$repoId/runs" $null $rajeshToken
Assert "runs history" ($runs.ok -and $runs.json.Count -ge 1 -and $runs.json[0].status -eq "done")

$foreignRuns = Call GET "/api/ai/github/repos/$repoId/runs" $null $priyaToken
Assert "other user cannot see runs" ($foreignRuns.status -eq 403)
$badDelete = Call DELETE "/api/ai/github/repos/$repoId" $null $priyaToken
Assert "other user cannot delete" ($badDelete.status -eq 403)

$del = Call DELETE "/api/ai/github/repos/$repoId" $null $rajeshToken
Assert "disconnect repo" ($del.status -eq 200)
$reposAfter = Call GET "/api/ai/github/repos" $null $rajeshToken
Assert "repo removed" ($reposAfter.json.Count -eq 0)

Write-Host "`n======================"
Write-Host "RESULT: $($script:pass) passed, $($script:fail) failed" -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
exit $(if ($script:fail -eq 0) { 0 } else { 1 })