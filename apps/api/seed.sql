-- SkillBridge sample data (clearly labelled as demo data)
-- Roles: user (posts jobs AND works on jobs), mentor (created by admin), admin.
-- Passwords: users => demo12345   mentors => mentor12345   admin => admin12345

DELETE FROM reviews;
DELETE FROM job_updates;
DELETE FROM team_members;
DELETE FROM milestones;
DELETE FROM applications;
DELETE FROM jobs;
DELETE FROM mentor_profiles;
DELETE FROM business_profiles;
DELETE FROM profiles;
DELETE FROM users;

-- Accounts
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('admin-001', 'admin@demo.com', '41e5653fc7aeb894026d6bb7b2db7f65902b454945fa8fd65a6327047b5277fb', 'SkillBridge Admin', 'admin'),
  ('mentor-001', 'mentor@demo.com', '2a1e1c5e9745577adc256eaa0ca44926c34358ab14f01821f89338ea4b4cf00b', 'Dr. Anil Gupta', 'mentor'),
  ('mentor-002', 'meera@demo.com', '2a1e1c5e9745577adc256eaa0ca44926c34358ab14f01821f89338ea4b4cf00b', 'Meera Rao', 'mentor'),
  ('user-001', 'rajesh@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Rajesh Kumar', 'user'),
  ('user-002', 'fatima@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Fatima Sheikh', 'user'),
  ('user-003', 'vikram@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Vikram Nair', 'user'),
  ('user-004', 'priya@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Priya Sharma', 'user'),
  ('user-005', 'arjun@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Arjun Mehta', 'user'),
  ('user-006', 'neha@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Neha Iyer', 'user');

-- Profiles for every user
INSERT INTO profiles (user_id, phone, city, college, bio, skills, public_slug, linkedin, github, portfolio) VALUES
  ('user-001', '+91 98290 11111', 'Jaipur', NULL, 'Owner of a small electronics retail and distribution business.', '["Business Operations","Excel"]', 'rajesh-kumar', NULL, NULL, NULL),
  ('user-002', '+91 98240 22222', 'Surat', NULL, 'Runs a textile manufacturing unit with 40 employees.', '["Manufacturing","Sourcing"]', 'fatima-sheikh', NULL, NULL, NULL),
  ('user-003', '+91 98430 33333', 'Coimbatore', NULL, 'Auto components workshop owner.', '["Automotive","Operations"]', 'vikram-nair', NULL, NULL, NULL),
  ('user-004', '+91 90000 44444', 'New Delhi', 'IIT Delhi', 'CS junior interested in data dashboards, marketing and automation.', '["Python","Excel","SQL","Canva","Copywriting"]', 'priya-sharma', 'https://linkedin.com/in/priyasharma', 'https://github.com/priyasharma', 'https://priya.dev'),
  ('user-005', '+91 90000 55555', 'Tiruchirappalli', 'NIT Trichy', 'Mechanical engineering student, CAD and 3D modelling enthusiast.', '["AutoCAD","SolidWorks","Blender","Fusion 360"]', 'arjun-mehta', 'https://linkedin.com/in/arjunmehta', 'https://github.com/arjunmehta', NULL),
  ('user-006', '+91 90000 66666', 'Vellore', 'VIT Vellore', 'Marketing and content strategy, loves storytelling with data.', '["SEO","Content Writing","Canva","Instagram"]', 'neha-iyer', 'https://linkedin.com/in/nehaiyer', NULL, NULL);

-- Business details (owners of posted jobs)
INSERT INTO business_profiles (user_id, business_name, sector, city, verification_status) VALUES
  ('user-001', 'Kumar Electronics', 'Retail & Distribution', 'Jaipur', 'verified'),
  ('user-002', 'Fatima Textiles', 'Textile Manufacturing', 'Surat', 'verified'),
  ('user-003', 'Nair Auto Parts', 'Automotive Components', 'Coimbatore', 'pending');

-- Mentor profiles
INSERT INTO mentor_profiles (user_id, expertise, organization, bio) VALUES
  ('mentor-001', '["Data Analysis","Python","Supply Chain","Marketing"]', 'IIT Delhi', 'Former industry researcher, now mentoring students on real business projects.'),
  ('mentor-002', '["CAD","Mechanical Design","Video Production","Manufacturing"]', 'IIT Madras', 'Product design mentor with 10 years in manufacturing.');

-- Jobs (positions JSON: {id, title, count})
INSERT INTO jobs (id, owner_id, title, description, category, required_skills, positions, budget_min, budget_max, deadline, acceptance_criteria, status, mentor_id) VALUES
  ('job-001', 'user-001', 'Social media campaign for festival sale',
   'We need a 2-week Diwali sale campaign for our electronics store: 6 Instagram posts, 4 reel scripts, a caption calendar and hashtag research.',
   'Marketing', '["Canva","Copywriting","Instagram"]',
   '[{"id":"pos-1a","title":"Marketing Lead","count":1},{"id":"pos-1b","title":"Graphic Designer","count":1},{"id":"pos-1c","title":"Content Creator","count":1}]',
   12000, 20000, '2026-11-10', 'Campaign covers Diwali + Dhanteras, on-brand, with a posting calendar and captions.', 'open', NULL),
  ('job-002', 'user-002', 'Product explainer video (60s)',
   'A 60-second explainer video for our new fabric line: script, voiceover, motion graphics and final MP4 for WhatsApp + YouTube.',
   'Video Editing', '["Premiere Pro","Motion Graphics","Scriptwriting"]',
   '[{"id":"pos-2a","title":"Scriptwriter","count":1},{"id":"pos-2b","title":"Video Editor","count":1},{"id":"pos-2c","title":"Motion Graphics Artist","count":1}]',
   15000, 25000, '2026-11-20', 'Final video in 1080p, subtitled, with brand colours.', 'open', NULL),
  ('job-003', 'user-003', 'Company website redesign',
   'Redesign our auto parts website: 5 pages, mobile-first, in Figma first then plain HTML/CSS. Content will be provided.',
   'Web Design', '["Figma","HTML","CSS"]',
   '[{"id":"pos-3a","title":"Frontend Developer","count":1},{"id":"pos-3b","title":"UI Designer","count":1}]',
   20000, 35000, '2026-12-05', 'Modern look, fast load, works on mobile; Figma file + static site delivered.', 'open', NULL),
  ('job-004', 'user-001', 'Monthly newsletter template',
   'Design a reusable email newsletter template (Figma + HTML email) for our monthly offers.',
   'Design', '["Figma","Email Design"]',
   '[{"id":"pos-4a","title":"Email Designer","count":1}]',
   3000, 4000, '2026-11-05', 'Editable template that renders well in Gmail and Outlook.', 'awarded', 'mentor-001'),
  ('job-005', 'user-002', '3D product renders for catalogue',
   'Render 8 fabric SKUs in 3D for our new catalogue (folds, drapes, textures).',
   '3D Design', '["Blender","Rendering"]',
   '[{"id":"pos-5a","title":"3D Artist","count":1}]',
   6000, 9000, '2026-11-18', '8 photorealistic renders at 2000px, transparent background.', 'in_progress', 'mentor-001'),
  ('job-006', 'user-003', 'Sales dashboard in Google Sheets',
   'Build a monthly sales dashboard in Google Sheets with charts and an automated summary sheet.',
   'Data', '["Google Sheets","Charts","Formulas"]',
   '[{"id":"pos-6a","title":"Data Analyst","count":1}]',
   4000, 6000, '2026-10-30', 'Dashboard updates from a raw sales sheet; summary auto-generated.', 'completed', 'mentor-002'),
  ('job-007', 'user-001', 'WhatsApp catalogue setup',
   'Set up a WhatsApp Business catalogue with 40 products: photos, descriptions, prices.',
   'Marketing', '["WhatsApp Business","Product Listing"]',
   '[{"id":"pos-7a","title":"Catalogue Specialist","count":1}]',
   2000, 3000, '2026-11-15', 'Catalogue published with correct product info and photos.', 'draft', NULL),
  ('job-008', 'user-002', 'Instagram reels pack (5 reels)',
   'Edit 5 short reels (15-30s) from raw clips we provide: cuts, captions, trending audio, covers.',
   'Video Editing', '["CapCut","Instagram","Subtitling"]',
   '[{"id":"pos-8a","title":"Reels Editor","count":1}]',
   5000, 7000, '2026-11-12', '5 reels ready to post, on-brand covers and captions.', 'delivered', 'mentor-002'),
  ('job-009', 'user-001', 'AI chatbot for order status',
   'Build a WhatsApp chatbot that answers order-status queries by reading a Google Sheet. Team: backend + AI/ML + frontend.',
   'Software', '["Python","Node.js","OpenAI API","React"]',
   '[{"id":"pos-9a","title":"Backend Developer","count":2},{"id":"pos-9b","title":"AI/ML Engineer","count":1},{"id":"pos-9c","title":"Frontend Developer","count":1}]',
   30000, 50000, '2026-12-15', 'Chatbot answers status queries under 2s, admin panel to manage the sheet.', 'open', NULL);

-- Applications (quotes per position)
INSERT INTO applications (id, job_id, applicant_id, position_id, pitch, quote_amount, status) VALUES
  ('app-001', 'job-001', 'user-004', 'pos-1a', 'I ran Diwali campaigns for 2 college fests; I can lead the campaign calendar and coordinate the team.', 8000, 'pending'),
  ('app-002', 'job-001', 'user-006', 'pos-1a', 'Content writer with Instagram growth experience; happy to lead or support the campaign.', 7500, 'pending'),
  ('app-003', 'job-001', 'user-006', 'pos-1c', 'I can create the caption calendar, hashtag research and all captions in the brand voice.', 6000, 'pending'),
  ('app-004', 'job-001', 'user-004', 'pos-1c', 'Copywriting is my strength; I can deliver captions plus reel scripts.', 5500, 'pending'),
  ('app-005', 'job-001', 'user-005', 'pos-1b', 'I design posters and social graphics in Canva and Figma; portfolio in profile.', 5000, 'pending'),
  ('app-006', 'job-002', 'user-006', 'pos-2a', 'I write video scripts and have done two explainer scripts for local brands.', 4000, 'pending'),
  ('app-007', 'job-002', 'user-005', 'pos-2b', 'I edit in Premiere Pro; can deliver with subtitles and 2 revision rounds.', 8000, 'pending'),
  ('app-008', 'job-002', 'user-004', 'pos-2c', 'I have made explainer videos with motion graphics; link to samples in my portfolio.', 7000, 'pending'),
  ('app-009', 'job-003', 'user-004', 'pos-3a', 'I code clean responsive HTML/CSS and have deployed 3 static sites.', 12000, 'pending'),
  ('app-010', 'job-003', 'user-005', 'pos-3a', 'I can build the static site and have done web projects with React.', 14000, 'pending'),
  ('app-011', 'job-003', 'user-006', 'pos-3b', 'I design in Figma with a strong sense of layout; can deliver a full UI kit.', 10000, 'pending'),
  ('app-012', 'job-004', 'user-004', 'pos-4a', 'I have built email templates before; can deliver a Gmail-safe HTML template plus the Figma source.', 3500, 'accepted'),
  ('app-013', 'job-004', 'user-006', 'pos-4a', 'Can design a clean newsletter with your brand colours in 5 days.', 3200, 'rejected'),
  ('app-014', 'job-005', 'user-005', 'pos-5a', 'Blender is my main tool; I can match fabric textures from photos and deliver 8 renders.', 7500, 'accepted'),
  ('app-015', 'job-006', 'user-004', 'pos-6a', 'I build Google Sheets dashboards with auto summaries; can deliver in a week.', 4500, 'accepted'),
  ('app-016', 'job-008', 'user-006', 'pos-8a', 'I edit reels weekly for a local boutique; can deliver all 5 with covers and captions.', 5500, 'accepted'),
  ('app-017', 'job-009', 'user-004', 'pos-9a', 'I have built chat integrations in Python (Flask) and can handle the WhatsApp webhook flow.', 12000, 'pending'),
  ('app-018', 'job-009', 'user-005', 'pos-9a', 'Node.js backend experience; I can build the bot and deploy it.', 13500, 'pending'),
  ('app-019', 'job-009', 'user-004', 'pos-9b', 'Worked with OpenAI APIs for a course project; can design the status-extraction prompts.', 11000, 'pending'),
  ('app-020', 'job-009', 'user-006', 'pos-9c', 'I build React admin panels; can do the order-status dashboard UI.', 9000, 'pending');

-- Hired team members
INSERT INTO team_members (id, job_id, user_id, position_id, position_title) VALUES
  ('tm-001', 'job-004', 'user-004', 'pos-4a', 'Email Designer'),
  ('tm-002', 'job-005', 'user-005', 'pos-5a', '3D Artist'),
  ('tm-003', 'job-006', 'user-004', 'pos-6a', 'Data Analyst'),
  ('tm-004', 'job-008', 'user-006', 'pos-8a', 'Reels Editor');

-- Milestones
INSERT INTO milestones (id, job_id, title, due_date, status, "order") VALUES
  ('ms-001', 'job-001', 'Campaign concept + calendar', '2026-10-28', 'pending', 1),
  ('ms-002', 'job-001', 'Posts + reels scripts', '2026-11-04', 'pending', 2),
  ('ms-003', 'job-001', 'Final captions + handover', '2026-11-10', 'pending', 3),
  ('ms-004', 'job-002', 'Script + storyboard', '2026-11-08', 'pending', 1),
  ('ms-005', 'job-002', 'Final video delivery', '2026-11-20', 'pending', 2),
  ('ms-006', 'job-003', 'Figma wireframes', '2026-11-15', 'pending', 1),
  ('ms-007', 'job-003', 'Static site build', '2026-11-28', 'pending', 2),
  ('ms-008', 'job-003', 'Polish + handover', '2026-12-05', 'pending', 3),
  ('ms-009', 'job-004', 'Template design', '2026-10-28', 'pending', 1),
  ('ms-010', 'job-004', 'HTML email build', '2026-11-05', 'pending', 2),
  ('ms-011', 'job-005', 'Material/texture study', '2026-10-26', 'approved', 1),
  ('ms-012', 'job-005', '4 product renders', '2026-11-08', 'submitted', 2),
  ('ms-013', 'job-005', 'Final 4 renders + tweaks', '2026-11-18', 'pending', 3),
  ('ms-014', 'job-006', 'Dashboard structure + data cleaning', '2026-10-15', 'approved', 1),
  ('ms-015', 'job-006', 'Charts + summary automation', '2026-10-30', 'approved', 2),
  ('ms-016', 'job-008', 'Cuts + captions for 3 reels', '2026-11-02', 'approved', 1),
  ('ms-017', 'job-008', 'Final 2 reels + covers', '2026-11-12', 'submitted', 2),
  ('ms-018', 'job-009', 'Architecture + sheet schema', '2026-11-20', 'pending', 1),
  ('ms-019', 'job-009', 'Chatbot + admin panel', '2026-12-05', 'pending', 2),
  ('ms-020', 'job-009', 'Testing + handover', '2026-12-15', 'pending', 3);

-- Progress timeline
INSERT INTO job_updates (id, job_id, author_id, kind, milestone_id, content) VALUES
  ('upd-001', 'job-004', 'user-001', 'system', NULL, 'Priya joined as Email Designer. Quote: ₹3500'),
  ('upd-002', 'job-004', 'user-001', 'system', NULL, 'Team complete! The job has been awarded and the chat is open for everyone.'),
  ('upd-003', 'job-004', 'mentor-001', 'system', NULL, 'Dr. Anil Gupta joined as mentor.'),
  ('upd-004', 'job-005', 'user-002', 'system', NULL, 'Arjun joined as 3D Artist. Quote: ₹7500'),
  ('upd-005', 'job-005', 'mentor-001', 'system', NULL, 'Dr. Anil Gupta joined as mentor.'),
  ('upd-006', 'job-005', 'user-005', 'submission', 'ms-011', 'Studied the fabric photos, set up PBR materials and lighting. First test render attached to chat.'),
  ('upd-007', 'job-005', 'mentor-001', 'approval', 'ms-011', 'Material study approved. Textures look right, watch the drape on chiffon.'),
  ('upd-008', 'job-005', 'user-005', 'submission', 'ms-012', 'Delivered 4 renders: cotton, silk, denim, chiffon. Links in chat.'),
  ('upd-009', 'job-005', 'mentor-001', 'update', NULL, 'Nice progress. For the final 4, add a soft studio backdrop so the catalogue looks uniform.'),
  ('upd-010', 'job-006', 'user-003', 'system', NULL, 'Priya joined as Data Analyst. Quote: ₹4500'),
  ('upd-011', 'job-006', 'mentor-002', 'system', NULL, 'Meera Rao joined as mentor.'),
  ('upd-012', 'job-006', 'user-004', 'submission', 'ms-014', 'Cleaned the raw sales sheet (12 months) and built the dashboard skeleton with 3 sheets.'),
  ('upd-013', 'job-006', 'mentor-002', 'approval', 'ms-014', 'Structure approved. Good use of named ranges.'),
  ('upd-014', 'job-006', 'user-004', 'submission', 'ms-015', 'Added monthly charts, YTD summary and the auto-generated summary sheet.'),
  ('upd-015', 'job-006', 'mentor-002', 'approval', 'ms-015', 'Approved. Summary automation works correctly.'),
  ('upd-016', 'job-006', 'user-003', 'system', NULL, 'Owner accepted the delivery. Job completed!'),
  ('upd-017', 'job-008', 'user-002', 'system', NULL, 'Neha joined as Reels Editor. Quote: ₹5500'),
  ('upd-018', 'job-008', 'mentor-002', 'system', NULL, 'Meera Rao joined as mentor.'),
  ('upd-019', 'job-008', 'user-006', 'submission', 'ms-016', 'First 3 reels edited with captions and trending audio. Covers done.'),
  ('upd-020', 'job-008', 'mentor-002', 'approval', 'ms-016', 'Reels approved. Captions are punchy — keep the same voice for the last two.'),
  ('upd-021', 'job-008', 'user-006', 'submission', 'ms-017', 'Final 2 reels edited and covers uploaded. Delivered the full pack of 5.');

-- Reviews on the completed job (both directions)
INSERT INTO reviews (id, job_id, reviewer_id, reviewee_id, rating, comment) VALUES
  ('rev-001', 'job-006', 'user-003', 'user-004', 5, 'Dashboard is clean and the auto-summary saves me an hour every month. Priya communicated clearly throughout.'),
  ('rev-002', 'job-006', 'user-004', 'user-003', 4, 'Clear brief and prompt feedback. Would work with Vikram again.');