# EW Discussion Platform

Version: EW V3 — Teacher Monitoring and Lane Configuration System (Planned)

---

# Goal

Expand EW Platform from a teacher-managed class system into a fully usable classroom discussion platform with teacher monitoring and lane configuration.

V2 established the core classroom infrastructure:

- teacher class creation
- join verification
- student roster system
- anonymous student labels
- stable discussion lanes

V3 focuses on giving the teacher better control over the discussion structure and visibility into class activity.

---

# Main Purpose of V3

V2 made the system usable for real classrooms by introducing:

- class identity
- join authentication
- roster validation

However, V2 still limits the teacher’s ability to:

- customize discussion lanes
- monitor discussion activity
- review participation

V3 expands the platform to support teacher visibility and discussion structure management while keeping the discussion itself student-centered and anonymous.

---

# Core Functions

## Lane Configuration

In V2, discussion lanes are automatically generated.

Example:

- Lane A  
- Lane B  
- Lane C  
- Lane D  

In V3, the teacher will be able to configure the discussion structure.

The Teacher Setup page should allow the teacher to define:

- number of lanes
- lane titles
- head prompts for each lane

---

## Teacher Monitoring Page

Teachers should be able to observe discussion activity.

A monitoring page should allow the teacher to view:

- number of students who joined
- total posts
- total replies
- activity per lane

Teachers should be able to open each lane to read discussion content.

Teachers should not edit or interfere with posts.

---

## Participation Overview

Teachers should be able to view participation summaries.

Example:

S01 — 3 posts  
S02 — 1 post  
S03 — 4 posts  
S04 — 0 posts  

Student real names should not appear in the discussion view.

---

## Discussion Export

Teachers should be able to export discussion content.

Export options:

- TXT
- CSV

Example export format:

Class: English Workshop A  
Date: 2026-04-10

Lane: AI and Society

S01  
I think AI will help students study independently.

---

# Pages

## Teacher Pages

/teacher/setup  
/teacher/live/[classId]  
/teacher/monitor/[classId]

### /teacher/setup

Teacher can:

- create class
- set class name
- set class code
- set join password
- define discussion lanes
- set lane prompts
- register student roster

---

### /teacher/live/[classId]

Teacher can:

- open the active discussion session
- view current lanes
- observe posts

This page should remain read-only.

---

### /teacher/monitor/[classId]

This page provides:

- participation statistics
- lane activity summary
- total posts
- total replies
- export tools

---

# Student Pages

/student/join  
/student/discussion/[classId]

Students will see:

- teacher-defined lane titles
- teacher-defined prompts

---

# Database Expansion for V3

Extend ew_lanes table.

Fields:

- id
- class_id
- lane_index
- lane_title
- lane_prompt
- created_at

---

# Important Rules

• Discussion remains anonymous (S01, S02, etc.)  
• Teacher roster remains separate from discussion display  
• Teacher can observe discussion but should not modify posts  
• Lane titles and prompts visible to all students  

---

# Not Included in V3

• AI language support  
• Azure TTS  
• student review page  
• participation analytics dashboard  
• grading system  

---

# Development Priorities for V3

1. Lane title configuration UI  
2. Lane prompt configuration UI  
3. Teacher monitoring page  
4. Participation summary logic  
5. Discussion export feature  

---

# Expected Outcome of V3

1. Teacher creates a class
2. Teacher defines discussion lanes and prompts
3. Teacher registers student roster
4. Students join using official student ID
5. Students participate anonymously
6. Teacher observes participation and discussion development

---

# Status

V2 has been implemented and deployed.

V3 will be designed after observing real classroom usage of V2.
