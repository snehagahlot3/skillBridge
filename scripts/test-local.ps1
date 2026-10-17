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
Assert "logins" ($rajesh.ok -and $priya.ok -and $arjun.ok -and $neha.ok -and $mentor.ok)

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
Assert "hire neha -> team complete -> awarded" ($h3.status -eq 200 -and $h3.json.teamComplete -eq $true)

$detail = Call GET "/api/jobs/$jobId" $null $rajeshToken
Assert "status=awarded" ($detail.json.status -eq "awarded")
Assert "team has 3 members" ($detail.json.team.Count -eq 3)
$portal = Call GET "/api/jobs" $null $priyaToken
Assert "awarded job delisted from portal" (-not ($portal.json | Where-Object { $_.id -eq $jobId }))

Write-Host "`n=== 6. Mentor + team work flow ==="
$claim = Call POST "/api/mentor/jobs/$jobId/claim" $null $mentorToken
Assert "mentor claims" ($claim.status -eq 200)

$start = Call POST "/api/jobs/$jobId/start" $null $arjunToken
Assert "team member starts" ($start.status -eq 200)

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
$outsiderChat = Call GET "/api/chat/$jobId/messages" $null $outsider.json.token
Assert "outsider blocked" ($outsiderChat.status -eq 403)
$rooms = Call GET "/api/chat/rooms" $null $priyaToken
$room = $rooms.json | Where-Object { $_.jobId -eq $jobId }
Assert "room lists team + mentor" ($room.teamNames.Count -eq 3 -and $room.mentorName -eq "Dr. Anil Gupta")

Write-Host "`n=== 11. AI brief ==="
$brief = Call POST "/api/ai/project-brief" @{ description = "We need a poster for our annual sale with festive themes and our logo."; language = "en" } $rajeshToken
Assert "ai brief" ($brief.status -eq 200 -and $brief.json.title)

Write-Host "`n======================"
Write-Host "RESULT: $($script:pass) passed, $($script:fail) failed" -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
exit $(if ($script:fail -eq 0) { 0 } else { 1 })