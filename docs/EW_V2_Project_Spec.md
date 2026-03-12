# EW Discussion Platform

Version: EW V2 — Teacher Setup and Class Roster System (Planned)

---

# Goal

Expand EW Platform from a student discussion prototype into a teacher-managed classroom system.

V2 focuses on giving the teacher control over:

- class creation
- class naming
- join settings
- student roster management

This version will prepare the platform for real classroom use by connecting student participation to an official teacher-defined class list.

---

# Main Purpose of V2

V1 proved that the student discussion system works.

V2 will make the platform practical for actual classes by adding a teacher-side setup system in which the teacher can define the class before students join.

This means the teacher will be able to prepare:

- class name
- class code
- join password
- lane structure
- student roster

---

# Core Functions

## Teacher Setup Page

The Teacher Setup page should allow the teacher to create and manage a discussion session.

It should include:

- Class Name
- Class Code
- Join Password
- Number of lanes
- Lane titles
- Head prompts for each lane

Example:

- Class Name: English Workshop A
- Class Code: EW001
- Join Password: pass1234

---

## Student Roster

The Teacher Setup page should also include a roster of students.

The roster should contain:

- Student ID
- Real Name

This roster becomes the official class member list for that session.

Example:

- 20250001 — Suzuki Taro
- 20250002 — Sato Hanako
- 20250003 — Eguchi Hitoshi

---

## Join Verification

Student joining should be upgraded in V2.

Instead of accepting any manually typed name, the system should verify:

- class code is correct
- password is correct
- student ID exists in the class roster
- real name matches the student ID

If the student already exists in the roster and has joined before:
- the system should restore the same anonymous label

If the student is in the roster but has not joined yet:
- the system should assign a new anonymous label

If the student ID is not in the roster:
- joining should be rejected

---

# Pages

## Teacher Pages

/teacher/setup  
/teacher/live/[classId]

### /teacher/setup
Main V2 page.

Teacher can:
- create class
- set class name
- set class code
- set join password
- define discussion lanes
- register student roster

### /teacher/live/[classId]
May remain simple in V2, but should at least allow the teacher to open the active class and view the session status.

---

## Student Pages

/student/join  
/student/discussion/[classId]

Student pages remain mostly the same as V1, but the join page will now check the teacher-defined roster.

---

# Database Expansion for V2

V2 may require one or more additional tables.

Possible new table:

ew_roster

Suggested fields:
- id
- class_id
- student_id
- real_name
- created_at

This table would store the teacher-defined student list for each class.

Alternative:
The existing ew_students structure may be expanded carefully, but the preferred design is to keep:

- ew_roster = official class list
- ew_students = students who actually joined the discussion

This separation is cleaner.

---

# Important Rules

• Teacher defines class identity before student entry  
• Teacher defines official student roster  
• Student ID becomes the true stable identity  
• Anonymous label remains only for discussion display  
• Same student should always return as the same anonymous label within the same class  
• Students not in the roster should not be allowed to join

---

# Not Included in V2

The following are still outside V2 scope:

• AI language support  
• Azure TTS  
• student review page  
• participation analytics dashboard  
• advanced moderation tools  
• teacher grading tools

These belong to later versions.

---

# Development Priorities for V2

1. Teacher Setup page UI
2. Class name / code / password creation
3. Lane setup fields
4. Student roster input
5. Roster-based join validation
6. Existing student rejoin logic using roster identity
7. End-to-end testing with multiple users

---

# Expected Outcome of V2

At the end of V2, the platform should support a real classroom workflow:

1. Teacher creates a class
2. Teacher enters class name and roster
3. Students join using official student ID and real name
4. Students are matched against the class roster
5. Discussion begins using the stable V1 discussion system

This will make the platform suitable for real class deployment.

---

# Status

V2 is planned but not yet implemented.

V1 is stable and complete enough to serve as the foundation for V2.