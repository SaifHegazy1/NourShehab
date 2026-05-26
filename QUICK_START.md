# 🚀 Quick Start Guide

## 1️⃣ Start MongoDB (Windows)

Open PowerShell and run:
```powershell
# If MongoDB is installed as a service:
net start MongoDB

# OR if using mongod directly:
mongod
```

Wait for the message: **"waiting for connections on port 27017"**

---

## 2️⃣ Start Your Portal Server

In the project folder (new terminal):
```powershell
npm start
```

Expected output:
```
Server running on port 3000
MongoDB connected
Default admin created: admin / admin123
```

---

## 3️⃣ Test Everything in Order

### ✅ Step 1: Admin Login
1. Open: http://localhost:3000/admin
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Admin Login"

### ✅ Step 2: Add a YouTube Video
In Admin Dashboard:
1. Scroll to **"Video Settings"**
2. YouTube Video ID: `dQw4w9WgXcQ` (or any YouTube video ID)
3. Title: `"Introduction to Math"`
4. Description: `"Let's learn math!"`
5. Click **"Update Video"**

### ✅ Step 3: Create a Student
In Admin Dashboard:
1. Scroll to **"Add Views to Student"**
2. Username: `student1`
3. Views to Add: `5`
4. Click **"Add Views"**
5. Copy the **Unique Code** shown in the Students List table

### ✅ Step 4: Student Setup & Login
1. Open: http://localhost:3000/student
2. Enter the unique code you copied
3. Click **"First time? Setup your password"**
4. Enter a password (e.g., `test123`)
5. Click **"Setup Password"**
6. Now login with code + password

### ✅ Step 5: Watch Your Video
1. After login, you'll see: http://localhost:3000/watch
2. YouTube video will load with your name as watermark
3. Views remaining will decrement
4. Watermark rotates corners every 30 seconds

---

## 🎯 How to Add YouTube Videos

### Step 1: Get a YouTube Video ID
- Go to YouTube and find your video
- Copy the URL: `https://www.youtube.com/watch?v=`**VIDEO_ID_HERE**
- **VIDEO_ID_HERE** = the ID you need

### Step 2: Upload Your Video to YouTube
1. Make it **UNLISTED** (important for security)
2. Copy the Video ID
3. Go to admin panel → Video Settings
4. Paste Video ID
5. Click "Update Video"

### Step 3: Students Can Watch
1. Students with remaining views login
2. Watch page automatically loads your YouTube video
3. View count decrements by 1

---

## 📋 Verification Checklist

Before using with real students:

- [ ] Server starts without errors
- [ ] Admin login works
- [ ] Can add YouTube video via admin panel
- [ ] Can create students and get unique codes
- [ ] Student login works
- [ ] Watch page loads YouTube video
- [ ] Watermark shows student username
- [ ] View count decrements after watching
- [ ] Student with 0 views gets error message

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection refused | Run `net start MongoDB` or `mongod` |
| Cannot see admin page | Clear browser cookies, try incognito mode |
| Video won't load | Verify YouTube Video ID is correct and video is "Unlisted" |
| Watermark missing | Check browser console (F12), ensure token is valid |
| Views not decrementing | Refresh page, check network tab in F12 |

---

## 🔑 Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**⚠️ Change these before production deployment!**

---

## 📱 Access Points

| Page | URL | Purpose |
|------|-----|---------|
| Home | http://localhost:3000 | Landing page |
| Student Login | http://localhost:3000/student | Student authentication |
| Watch Video | http://localhost:3000/watch | Video player |
| Admin Panel | http://localhost:3000/admin | Management dashboard |
| About | http://localhost:3000/about | Tutor info |

---

## 🎓 Ready to Go!

Your educational portal is now fully functional and ready to stream YouTube videos to your students!

**Next: Follow Step 3 above to test everything end-to-end.**
