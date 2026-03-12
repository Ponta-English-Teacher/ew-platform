# EW Discussion Platform

Version: EW V1 — Core Student Discussion System (Stable)

---

# Goal

Create a lightweight classroom discussion platform where students exchange short messages in parallel discussion lanes during class activities.

The system should support fast interaction, clear conversation structure, and minimal technical friction, allowing students to focus on communicating in English.

---

# Core Functions

## Student Access
- Students join using Class Code and Join Password
- Students enter Student ID and Real Name
- System assigns an anonymous label (S01, S02, etc.)
- Returning students can rejoin the session as the same user

## Discussion Structure
- Discussions are organized into parallel lanes (A, B, C, D)
- Each lane contains a head prompt provided by the teacher
- Students may post multiple messages in each lane

## Posting
- Students post short messages (approximately 15–40 words)
- Posts appear in chronological order
- Posts display:
  - post number
  - anonymous student label
  - message content

## Reply System
Students may reply to earlier posts.

Reply behavior includes:

- selecting a post to reply to
- reply references the original post number
- compact preview of the referenced post
- preview shows:
  - original author label
  - truncated message content

Clicking the referenced post:
- scrolls to the original message
- temporarily highlights the original post

## Post Deletion Rule

A student may delete a post only if no reply has been made to it.

If another student replies, the delete option disappears to preserve conversation integrity.

## User Interface Feedback

The interface visually distinguishes different states:

- Blue background: the student's own posts
- Orange background: reply target selected
- Yellow highlight: post referenced via jump

## Real-Time Updates

The system uses Supabase Realtime so that:

- new posts appear automatically
- deleted posts disappear automatically
- the discussion updates live during class

---

# Pages

## Teacher Pages

/teacher/setup  
/teacher/live/[classId]

Teacher pages are intended for:
- creating discussion sessions
- monitoring live student participation

(Full teacher functionality will be expanded in V2.)

---

## Student Pages

/student/join  
/student/discussion/[classId]

### Student Join Page

Students enter:
- class code
- join password
- student ID
- real name

### Student Discussion Page

Students can:
- select discussion lanes
- read existing posts
- reply to earlier posts
- write new messages
- delete posts if allowed by rules

---

# Database Tables

The system uses the following Supabase tables:

ew_classes  
ew_lanes  
ew_students  
ew_posts

### ew_classes
Stores class sessions.

### ew_lanes
Stores discussion lanes and prompts.

### ew_students
Stores student identity and anonymous labels.

### ew_posts
Stores discussion messages and reply relationships.

---

# Important Rules

• Posts are short messages (about 15–40 words)  
• Discussions are organized by lanes  
• Posts appear in chronological order  
• Replies reference earlier posts  
• Students appear using anonymous labels  
• Posts cannot be deleted once a reply exists

These rules preserve clarity and conversation flow during live discussion.

---

# Not Included in V1

The following features are intentionally postponed:

• AI language correction  
• “How do you say this?” support  
• Azure TTS speech generation  
• student reflection or review pages  
• participation analytics or charts  
• advanced moderation tools

These may be added in later versions.

---

# Build Order (Original Development Sequence)

1. Supabase database schema  
2. Teacher setup page  
3. Student join page  
4. Student discussion interface  
5. Teacher live monitoring  
6. End-to-end testing

---

# Status

EW V1 is now functionally stable and suitable for classroom testing.

Future versions will expand the system with teacher management tools and learning support features.