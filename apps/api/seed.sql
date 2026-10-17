-- SkillBridge sample data (clearly labelled as demo data)
-- Unified accounts: role 'user' can both post projects and work on them.
-- Separate 'mentor' accounts power the admin panel.
-- Passwords: users => demo12345   mentors => mentor12345

DELETE FROM verified_skills;
DELETE FROM audit_log;
DELETE FROM reviews;
DELETE FROM submissions;
DELETE FROM milestones;
DELETE FROM applications;
DELETE FROM projects;
DELETE FROM mentor_profiles;
DELETE FROM business_profiles;
DELETE FROM profiles;
DELETE FROM users;

-- Users (all regular accounts share password demo12345)
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('user-001', 'rajesh@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Rajesh Kumar', 'user'),
  ('user-002', 'fatima@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Fatima Sheikh', 'user'),
  ('user-003', 'vikram@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Vikram Nair', 'user'),
  ('user-004', 'priya@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Priya Sharma', 'user'),
  ('user-005', 'arjun@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Arjun Mehta', 'user'),
  ('user-006', 'neha@demo.com', '51459c23ca91ebce271449dd8b5c26751c99039c2ae4c628067898ca0e104039', 'Neha Iyer', 'user'),
  ('mentor-001', 'mentor@demo.com', '2a1e1c5e9745577adc256eaa0ca44926c34358ab14f01821f89338ea4b4cf00b', 'Dr. Anil Gupta', 'mentor'),
  ('mentor-002', 'meera@demo.com', '2a1e1c5e9745577adc256eaa0ca44926c34358ab14f01821f89338ea4b4cf00b', 'Meera Rao', 'mentor');

-- Profiles (contact + talent) for every user
INSERT INTO profiles (user_id, phone, city, college, bio, skills, public_slug, passport_consent, linkedin, github, portfolio) VALUES
  ('user-001', '+91 98290 11111', 'Jaipur', NULL, 'Owner of a small electronics retail and distribution business.', '["Business Operations","Excel"]', 'rajesh-kumar', 0, NULL, NULL, NULL),
  ('user-002', '+91 98240 22222', 'Surat', NULL, 'Runs a textile manufacturing unit with 40 employees.', '["Manufacturing","Sourcing"]', 'fatima-sheikh', 0, NULL, NULL, NULL),
  ('user-003', '+91 98430 33333', 'Coimbatore', NULL, 'Auto components workshop owner.', '["Automotive","Operations"]', 'vikram-nair', 0, NULL, NULL, NULL),
  ('user-004', '+91 90000 44444', 'New Delhi', 'IIT Delhi', 'CS junior interested in data dashboards and automation.', '["Python","Excel","SQL","Data Visualization"]', 'priya-sharma', 1, 'https://linkedin.com/in/priyasharma', 'https://github.com/priyasharma', 'https://priya.dev'),
  ('user-005', '+91 90000 55555', 'Tiruchirappalli', 'NIT Trichy', 'Mechanical engineering student, CAD and 3D modelling enthusiast.', '["AutoCAD","SolidWorks","Fusion 360"]', 'arjun-mehta', 1, 'https://linkedin.com/in/arjunmehta', 'https://github.com/arjunmehta', NULL),
  ('user-006', '+91 90000 66666', 'Vellore', 'VIT Vellore', 'Marketing and content strategy, loves storytelling with data.', '["SEO","Content Writing","Canva"]', 'neha-iyer', 0, 'https://linkedin.com/in/nehaiyer', NULL, NULL);

-- Business details (added when a user posts a project)
INSERT INTO business_profiles (user_id, business_name, sector, city, verification_status) VALUES
  ('user-001', 'Kumar Electronics', 'Retail & Distribution', 'Jaipur', 'verified'),
  ('user-002', 'Fatima Textiles', 'Textile Manufacturing', 'Surat', 'verified'),
  ('user-003', 'Nair Auto Parts', 'Automotive Components', 'Coimbatore', 'pending');

INSERT INTO mentor_profiles (user_id, expertise, organization, bio) VALUES
  ('mentor-001', '["Data Analysis","Python","Supply Chain"]', 'IIT Delhi', 'Former industry researcher, now mentoring students'),
  ('mentor-002', '["CAD","Mechanical Design","Manufacturing"]', 'IIT Madras', 'Product design mentor with 10 years in manufacturing');

-- Projects
INSERT INTO projects (id, owner_id, title, description, category, required_skills, budget_type, budget_amount, deadline, acceptance_criteria, rubric, status, mentor_id) VALUES
  ('proj-001', 'user-001', 'Inventory Stockout Dashboard',
   'Build a dashboard to track inventory levels and alert when stock falls below reorder points.',
   'Dashboard', '["Excel","Data Visualization","Basic SQL"]', 'stipend', 5000, '2026-11-15',
   'Dashboard loads real inventory data, shows stock levels visually, and sends alerts when items fall below threshold.',
   '[{"criterion":"Data Accuracy","description":"Dashboard correctly reflects inventory data","maxScore":4},{"criterion":"Visualization Quality","description":"Charts are clear and informative","maxScore":4},{"criterion":"Alert System","description":"Low-stock alerts work reliably","maxScore":4},{"criterion":"Documentation","description":"Clear instructions for the owner","maxScore":4},{"criterion":"Timeliness","description":"Delivered within deadline","maxScore":4}]',
   'completed', 'mentor-001'),
  ('proj-002', 'user-001', 'Automate GST Invoice Generation',
   'We create invoices manually in Excel every week. Need a small script to auto-generate GST invoices from our sales sheet.',
   'Automation', '["Python","Excel","PDF Generation"]', 'paid', 8000, '2026-11-30',
   'Script reads the sales sheet and outputs correctly formatted GST invoices as PDFs.',
   'null', 'open', 'mentor-001'),
  ('proj-003', 'user-002', 'Warehouse Layout Optimisation',
   'Our fabric storage is disorganised and we lose time finding rolls. Need a proposed layout with a simple visual plan.',
   'Design', '["AutoCAD","Layout Planning"]', 'stipend', 6000, '2026-12-05',
   'Layout plan reduces walking distance and groups fabric by frequency of use.',
   'null', 'open', 'mentor-002'),
  ('proj-004', 'user-002', 'Product Catalogue Design',
   'We need a clean, printable catalogue of our top 40 fabric SKUs with photos and prices.',
   'Marketing', '["Canva","Graphic Design"]', 'unpaid', null, '2026-12-10',
   'Catalogue is print-ready and matches our brand colours.',
   'null', 'open', null),
  ('proj-005', 'user-003', 'Brake Pad Wear Log Web App',
   'Mechanics log brake pad replacements in a notebook. We want a simple web form with a searchable history.',
   'Software', '["HTML","JavaScript","Web Forms"]', 'paid', 10000, '2026-12-20',
   'Web form saves entries and allows searching by vehicle number.',
   'null', 'draft', null),
  ('proj-006', 'user-003', 'Monthly Sales Summary Automation',
   'Turn our monthly sales spreadsheet into an automatic summary with charts emailed to the owner.',
   'Automation', '["Excel","Google Apps Script"]', 'stipend', 4000, '2026-11-28',
   'Summary is generated automatically and emailed on the 1st of each month.',
   'null', 'open', 'mentor-001');

-- Applications
INSERT INTO applications (id, project_id, applicant_id, pitch, status) VALUES
  ('app-001', 'proj-001', 'user-004', 'I built a similar stock tracker for my college canteen and can deliver this in 3 weeks.', 'accepted'),
  ('app-002', 'proj-002', 'user-004', 'I have automated invoice generation with Python and reportlab before.', 'pending'),
  ('app-003', 'proj-003', 'user-005', 'I have done warehouse layout projects in AutoCAD during my internship.', 'pending'),
  ('app-004', 'proj-004', 'user-006', 'I can design a clean catalogue in Canva and match your brand.', 'pending');

-- Milestones for the completed project
INSERT INTO milestones (id, project_id, title, due_date, status, "order") VALUES
  ('ms-001', 'proj-001', 'Data collection and cleaning', '2026-10-20', 'approved', 1),
  ('ms-002', 'proj-001', 'Dashboard prototype', '2026-10-27', 'approved', 2),
  ('ms-003', 'proj-001', 'Alert system and final delivery', '2026-11-03', 'approved', 3),
  ('ms-004', 'proj-002', 'Requirements and data mapping', '2026-11-10', 'pending', 1),
  ('ms-005', 'proj-002', 'Invoice generator script', '2026-11-20', 'pending', 2),
  ('ms-006', 'proj-002', 'Testing and handover', '2026-11-30', 'pending', 3);

-- Submission
INSERT INTO submissions (id, milestone_id, applicant_id, notes, file_urls) VALUES
  ('sub-001', 'ms-001', 'user-004', 'Cleaned inventory data and set up the base dashboard.', '["uploads/cleaned-data.xlsx"]'),
  ('sub-002', 'ms-002', 'user-004', 'Dashboard prototype with stock level charts.', '["uploads/dashboard-v1.xlsx"]'),
  ('sub-003', 'ms-003', 'user-004', 'Final dashboard with automated low-stock alerts.', '["uploads/dashboard-final.xlsx"]');

-- Mentor reviews
INSERT INTO reviews (id, submission_id, reviewer_id, reviewer_type, rubric_scores, comments, decision) VALUES
  ('rev-001', 'sub-001', 'mentor-001', 'mentor',
   '[{"criterion":"Data Accuracy","score":4},{"criterion":"Visualization Quality","score":3},{"criterion":"Alert System","score":4},{"criterion":"Documentation","score":3},{"criterion":"Timeliness","score":4}]',
   'Good work. Clean data handling and clear visualizations.', 'approved'),
  ('rev-002', 'sub-003', 'mentor-001', 'mentor',
   '[{"criterion":"Data Accuracy","score":4},{"criterion":"Visualization Quality","score":4},{"criterion":"Alert System","score":4},{"criterion":"Documentation","score":3},{"criterion":"Timeliness","score":4}]',
   'Excellent final delivery. Alerts tested and working.', 'approved');

-- Verified skills (the passport evidence)
INSERT INTO verified_skills (id, user_id, skill, level, project_id, review_id) VALUES
  ('vs-001', 'user-004', 'Data Accuracy', 'Advanced', 'proj-001', 'rev-002'),
  ('vs-002', 'user-004', 'Visualization Quality', 'Advanced', 'proj-001', 'rev-002'),
  ('vs-003', 'user-004', 'Alert System', 'Advanced', 'proj-001', 'rev-002'),
  ('vs-004', 'user-004', 'Documentation', 'Intermediate', 'proj-001', 'rev-002'),
  ('vs-005', 'user-004', 'Timeliness', 'Advanced', 'proj-001', 'rev-002');
