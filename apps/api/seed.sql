-- SkillBridge sample data (clearly labelled as demo data)

DELETE FROM verified_skills;
DELETE FROM audit_log;
DELETE FROM reviews;
DELETE FROM submissions;
DELETE FROM milestones;
DELETE FROM applications;
DELETE FROM projects;
DELETE FROM mentor_profiles;
DELETE FROM student_profiles;
DELETE FROM sme_profiles;
DELETE FROM users;

-- Users (password: sme12345 / student12345 / mentor12345 / admin12345)
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('sme-001', 'sme@demo.com', 'a9d053df85982887213cc87bde59d218dda53604ea55bdd69871eefb3c3dead7', 'Rajesh Kumar', 'sme'),
  ('sme-002', 'fatima@demo.com', 'a9d053df85982887213cc87bde59d218dda53604ea55bdd69871eefb3c3dead7', 'Fatima Sheikh', 'sme'),
  ('sme-003', 'vikram@demo.com', 'a9d053df85982887213cc87bde59d218dda53604ea55bdd69871eefb3c3dead7', 'Vikram Nair', 'sme'),
  ('student-001', 'student@demo.com', '5d8cfeea5cec19f5d84b2b7123f000a81c6290e155924f9fb54f3316f08fd996', 'Priya Sharma', 'student'),
  ('student-002', 'arjun@demo.com', '5d8cfeea5cec19f5d84b2b7123f000a81c6290e155924f9fb54f3316f08fd996', 'Arjun Mehta', 'student'),
  ('student-003', 'neha@demo.com', '5d8cfeea5cec19f5d84b2b7123f000a81c6290e155924f9fb54f3316f08fd996', 'Neha Iyer', 'student'),
  ('mentor-001', 'mentor@demo.com', '2a1e1c5e9745577adc256eaa0ca44926c34358ab14f01821f89338ea4b4cf00b', 'Dr. Anil Gupta', 'mentor'),
  ('mentor-002', 'meera@demo.com', '2a1e1c5e9745577adc256eaa0ca44926c34358ab14f01821f89338ea4b4cf00b', 'Meera Rao', 'mentor'),
  ('admin-001', 'admin@demo.com', 'a9d053df85982887213cc87bde59d218dda53604ea55bdd69871eefb3c3dead7', 'Admin', 'admin');

INSERT INTO sme_profiles (user_id, business_name, sector, city, verification_status) VALUES
  ('sme-001', 'Kumar Electronics', 'Retail & Distribution', 'Jaipur', 'verified'),
  ('sme-002', 'Fatima Textiles', 'Textile Manufacturing', 'Surat', 'verified'),
  ('sme-003', 'Nair Auto Parts', 'Automotive Components', 'Coimbatore', 'pending');

INSERT INTO student_profiles (user_id, college, bio, skills, public_slug, passport_consent) VALUES
  ('student-001', 'IIT Delhi', 'CS junior interested in data dashboards and automation', '["Python","Excel","SQL","Data Visualization"]', 'priya-sharma', 1),
  ('student-002', 'NIT Trichy', 'Mechanical engineering student, CAD and 3D modelling enthusiast', '["AutoCAD","SolidWorks","Fusion 360"]', 'arjun-mehta', 1),
  ('student-003', 'VIT Vellore', 'Marketing and content strategy, loves storytelling with data', '["SEO","Content Writing","Canva"]', 'neha-iyer', 0);

INSERT INTO mentor_profiles (user_id, expertise, organization, bio) VALUES
  ('mentor-001', '["Data Analysis","Python","Supply Chain"]', 'IIT Delhi', 'Former industry researcher, now mentoring students'),
  ('mentor-002', '["CAD","Mechanical Design","Manufacturing"]', 'IIT Madras', 'Product design mentor with 10 years in manufacturing');

-- Projects
INSERT INTO projects (id, sme_id, title, description, category, required_skills, budget_type, budget_amount, deadline, acceptance_criteria, rubric, status, mentor_id) VALUES
  ('proj-001', 'sme-001', 'Inventory Stockout Dashboard',
   'Build a dashboard to track inventory levels and alert when stock falls below reorder points.',
   'Dashboard', '["Excel","Data Visualization","Basic SQL"]', 'stipend', 5000, '2026-11-15',
   'Dashboard loads real inventory data, shows stock levels visually, and sends alerts when items fall below threshold.',
   '[{"criterion":"Data Accuracy","description":"Dashboard correctly reflects inventory data","maxScore":4},{"criterion":"Visualization Quality","description":"Charts are clear and informative","maxScore":4},{"criterion":"Alert System","description":"Low-stock alerts work reliably","maxScore":4},{"criterion":"Documentation","description":"Clear instructions for SME","maxScore":4},{"criterion":"Timeliness","description":"Delivered within deadline","maxScore":4}]',
   'completed', 'mentor-001'),
  ('proj-002', 'sme-001', 'Automate GST Invoice Generation',
   'We create invoices manually in Excel every week. Need a small script to auto-generate GST invoices from our sales sheet.',
   'Automation', '["Python","Excel","PDF Generation"]', 'paid', 8000, '2026-11-30',
   'Script reads the sales sheet and outputs correctly formatted GST invoices as PDFs.',
   'null', 'open', 'mentor-001'),
  ('proj-003', 'sme-002', 'Warehouse Layout Optimisation',
   'Our fabric storage is disorganised and we lose time finding rolls. Need a proposed layout with a simple visual plan.',
   'Design', '["AutoCAD","Layout Planning"]', 'stipend', 6000, '2026-12-05',
   'Layout plan reduces walking distance and groups fabric by frequency of use.',
   'null', 'open', 'mentor-002'),
  ('proj-004', 'sme-002', 'Product Catalogue Design',
   'We need a clean, printable catalogue of our top 40 fabric SKUs with photos and prices.',
   'Marketing', '["Canva","Graphic Design"]', 'unpaid', null, '2026-12-10',
   'Catalogue is print-ready and matches our brand colours.',
   'null', 'open', null),
  ('proj-005', 'sme-003', 'Brake Pad Wear Log Web App',
   'Mechanics log brake pad replacements in a notebook. We want a simple web form with a searchable history.',
   'Software', '["HTML","JavaScript","Web Forms"]', 'paid', 10000, '2026-12-20',
   'Web form saves entries and allows searching by vehicle number.',
   'null', 'draft', null),
  ('proj-006', 'sme-003', 'Monthly Sales Summary Automation',
   'Turn our monthly sales spreadsheet into an automatic summary with charts emailed to the owner.',
   'Automation', '["Excel","Google Apps Script"]', 'stipend', 4000, '2026-11-28',
   'Summary is generated automatically and emailed on the 1st of each month.',
   'null', 'open', 'mentor-001');

-- Applications
INSERT INTO applications (id, project_id, student_id, pitch, status) VALUES
  ('app-001', 'proj-001', 'student-001', 'I built a similar stock tracker for my college canteen and can deliver this in 3 weeks.', 'accepted'),
  ('app-002', 'proj-002', 'student-001', 'I have automated invoice generation with Python and reportlab before.', 'pending'),
  ('app-003', 'proj-003', 'student-002', 'I have done warehouse layout projects in AutoCAD during my internship.', 'pending'),
  ('app-004', 'proj-004', 'student-003', 'I can design a clean catalogue in Canva and match your brand.', 'pending');

-- Milestones for the completed project
INSERT INTO milestones (id, project_id, title, due_date, status, "order") VALUES
  ('ms-001', 'proj-001', 'Data collection and cleaning', '2026-10-20', 'approved', 1),
  ('ms-002', 'proj-001', 'Dashboard prototype', '2026-10-27', 'approved', 2),
  ('ms-003', 'proj-001', 'Alert system and final delivery', '2026-11-03', 'approved', 3),
  ('ms-004', 'proj-002', 'Requirements and data mapping', '2026-11-10', 'pending', 1),
  ('ms-005', 'proj-002', 'Invoice generator script', '2026-11-20', 'pending', 2),
  ('ms-006', 'proj-002', 'Testing and handover', '2026-11-30', 'pending', 3);

-- Submission
INSERT INTO submissions (id, milestone_id, student_id, notes, file_urls) VALUES
  ('sub-001', 'ms-001', 'student-001', 'Cleaned inventory data and set up the base dashboard.', '["uploads/cleaned-data.xlsx"]'),
  ('sub-002', 'ms-002', 'student-001', 'Dashboard prototype with stock level charts.', '["uploads/dashboard-v1.xlsx"]'),
  ('sub-003', 'ms-003', 'student-001', 'Final dashboard with automated low-stock alerts.', '["uploads/dashboard-final.xlsx"]');

-- Reviews (SME delivery confirmation + mentor rubric review)
INSERT INTO reviews (id, submission_id, reviewer_id, reviewer_type, rubric_scores, comments, decision) VALUES
  ('rev-sme-001', 'sub-003', 'sme-001', 'sme', '[{"criterion":"Data Accuracy","score":4}]', 'Looks correct, matches our stock sheet.', 'approved'),
  ('rev-001', 'sub-001', 'mentor-001', 'mentor',
   '[{"criterion":"Data Accuracy","score":4},{"criterion":"Visualization Quality","score":3},{"criterion":"Alert System","score":4},{"criterion":"Documentation","score":3},{"criterion":"Timeliness","score":4}]',
   'Good work. Clean data handling and clear visualizations.', 'approved'),
  ('rev-002', 'sub-003', 'mentor-001', 'mentor',
   '[{"criterion":"Data Accuracy","score":4},{"criterion":"Visualization Quality","score":4},{"criterion":"Alert System","score":4},{"criterion":"Documentation","score":3},{"criterion":"Timeliness","score":4}]',
   'Excellent final delivery. Alerts tested and working.', 'approved');

-- Verified skills (the passport evidence)
INSERT INTO verified_skills (id, student_id, skill, level, project_id, review_id) VALUES
  ('vs-001', 'student-001', 'Data Accuracy', 'Advanced', 'proj-001', 'rev-002'),
  ('vs-002', 'student-001', 'Visualization Quality', 'Advanced', 'proj-001', 'rev-002'),
  ('vs-003', 'student-001', 'Alert System', 'Advanced', 'proj-001', 'rev-002'),
  ('vs-004', 'student-001', 'Documentation', 'Intermediate', 'proj-001', 'rev-002'),
  ('vs-005', 'student-001', 'Timeliness', 'Advanced', 'proj-001', 'rev-002');
