# Educational Portal - Setup & Testing Guide

## Prerequisites Check ✓
- ✅ Dependencies installed (see `npm install` in context)
- ✅ Node.js server configured
- ✅ MongoDB URI configured in `.env`
- ✅ JWT Secret configured
- ✅ Frontend files ready

---

## Step 1: Start MongoDB
**Windows:**
```powershell
# Option A: Using MongoDB service (if installed)
net start MongoDB

# Option B: Using Homebrew/Chocolatey
mongod

# Option C: Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

**Verify MongoDB is running:**
```powershell
# Open another terminal and connect to MongoDB
mongosh # or mongo for older versions
```

---

## Step 2: Start the Server
```bash
npm start
# Server will run on http://localhost:3000
# Expected output: "Server running on port 3000" + "MongoDB connected"
```

---

## Step 3: Test Core Functionality

### 3a. Admin Login Test
**URL:** http://localhost:3000/admin

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**Test:**
1. Click "Admin Login"
2. Enter credentials above
3. Verify you see the admin dashboard

### 3b. Create/View Students
**On Admin Dashboard:**
1. Go to "Manage Students" section
2. Either:
   - **Manual Entry**: Enter username and initial views, click "Add Student"
   - **Excel Upload**: Use sample CSV with columns: `username, allowedViews`

**Sample CSV:**
```
username,allowedViews
student1,5
student2,10
student3,3
```

### 3c. Student Registration Test
**URL:** http://localhost:3000/student

**Test:**
1. Enter a unique code created in admin panel (displayed after adding student)
2. Click "First time? Setup your password"
3. Create a password (min 4 characters)
4. Click "Setup Password"
5. Then login with the code and password

### 3d. Video Player Test
**On Admin Dashboard:**
1. Go to "Video Settings"
2. Enter a YouTube Video ID (e.g., `dQw4w9WgXcQ`)
3. Enter title and description
4. Click "Update Settings"
5. Login as student and click "Watch Video"
6. Verify video plays with watermark showing username

---

## Step 4: YouTube Integration

### Adding YouTube Videos

**Important: Use Unlisted Videos for Security**
1. Upload your video to YouTube
2. Set it to "Unlisted" (not Private, not Public)
3. Copy the Video ID from the URL: `youtube.com/watch?v=`**VIDEO_ID_HERE**

### Configure in Admin Panel
1. Login as admin → http://localhost:3000/admin
2. Scroll to "Video Settings"
3. Paste YouTube Video ID
4. Add title and description
5. Click "Update Settings"

### How It Works
- Videos display via embedded iframe
- Watermark shows student's username
- View count decrements after each watch
- Students with 0 views cannot watch

---

## Step 5: Expected Behavior Checklist

- [ ] MongoDB connects without errors
- [ ] Admin login works with default credentials
- [ ] Can add students manually
- [ ] Can upload students via Excel
- [ ] Student can set password with unique code
- [ ] Student login succeeds
- [ ] Video player loads and displays YouTube video
- [ ] Watermark displays student username
- [ ] View count decrements after watching
- [ ] Student with 0 views sees error message

---

## Troubleshooting

### "MongoDB connection failed"
```
Solution: Ensure MongoDB service is running
Windows: net start MongoDB
Or: mongod (in separate terminal)
```

### "Cannot GET /watch" after student login
```
Solution: Make sure you've:
1. Added a YouTube Video ID in admin panel
2. Assigned views to the student account
3. Student has allowedViews > 0
```

### Watermark not showing
```
Solution: Check browser console (F12)
- Verify JWT token is being sent
- Ensure watch.html JavaScript is running
- Check that student has valid token
```

### Video not loading
```
Solution:
1. Verify YouTube Video ID is correct
2. Ensure video is "Unlisted" (not Private)
3. Check browser console for CORS errors
4. Verify iframe permissions in server.js
```

---

## Default Admin Account
- **Username:** `Nour`
- **Password:** `Nour1324*#`
- **Action:** ⚠️ Change this in production!

---

## Environment Variables (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/educational-portal
JWT_SECRET=mySuperSecretKeyChangeThisForProduction
FRONTEND_URL=http://localhost:3000
```

---

## Production Deployment Checklist
- [ ] Change JWT_SECRET to a strong random string
- [ ] Change admin password (use admin panel)
- [ ] Set FRONTEND_URL to your domain
- [ ] Use production MongoDB URI
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Use environment variables for all secrets

---

## Deploy Backend on Render
1. Create a new Web Service on Render.
2. Connect the repository from GitHub.
3. Set the service type to `Web Service` and select the root directory.
4. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables:
   - `PORT` (optional; Render provides one)
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL` set to your Vercel frontend URL, for example `https://your-site.vercel.app`
6. Deploy the service.

## Deploy Frontend on Vercel
1. Add a new Project on Vercel and connect the repository.
2. Use the provided `vercel.json` configuration to serve `public/` as a static site.
3. If your backend runs on Render, set the API base URL in your frontend HTML before `api-base.js` loads:
```html
<script>window.API_BASE_URL = 'https://your-render-backend.onrender.com';</script>
<script src="/api-base.js"></script>
```
4. Verify that requests from Vercel to the Render backend are allowed by CORS.
5. In the Render backend, ensure `FRONTEND_URL` matches your Vercel site.

---

## Key Features Enabled
✅ Student registration with unique codes
✅ View-based access control
✅ YouTube unlisted video support
✅ Dynamic watermarking
✅ Admin management dashboard
✅ Excel bulk student import
✅ Password security with bcrypt
✅ JWT authentication
✅ Rate limiting on API endpoints
✅ Security headers with Helmet
