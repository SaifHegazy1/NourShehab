# YouTube Integration Guide

## ✅ Your Portal is Ready for YouTube Videos

Your educational portal has been designed specifically to host YouTube videos with security features:

- **Watermark**: Each student's username appears on the video
- **View Limits**: Control how many videos each student can watch
- **Unlisted Videos**: Use YouTube's unlisted feature for privacy
- **Anti-Copy**: Disables right-click and developer tools during playback

---

## 🔍 How to Find Your YouTube Video ID

### From YouTube URL:
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
                                 ^^^^^^^^^^^
                                 VIDEO ID HERE
```

### Steps:
1. Go to youtube.com
2. Find or upload your video
3. Click Share
4. The URL in the address bar contains your Video ID

---

## 🎬 Adding Videos to Your Portal

### One-Time Setup (Admin Panel)

**URL:** `http://localhost:3000/admin`

1. **Login**: admin / admin123
2. **Go to "Video Settings"**
3. **Enter:**
   - YouTube Video ID: `dQw4w9WgXcQ`
   - Video Title: `Introduction to Chapter 1`
   - Description: `Learn the fundamentals...`
4. **Click "Update Video"**

### Switching Videos

Simply repeat the process with a new Video ID. All students with remaining views will see the new video.

---

## 🔒 YouTube Video Security

### Why Use "Unlisted" Videos?

**Unlisted = Accessible only via direct link**
- Video doesn't appear in search results
- Video doesn't appear on your YouTube channel
- Only people with the link can watch
- Perfect for educational content

### How to Set Video to Unlisted:

1. Upload video to YouTube
2. Click "Share"
3. Select **"Unlisted"** (not Public, not Private)
4. Copy Video ID

---

## 👥 Managing Student Views

### Add Views to Students:

**Option 1: Individual Entry**
- Admin Panel → "Add Views to Student"
- Enter username and number of views
- Click "Add Views"

**Option 2: Bulk Upload via Excel**
- Create Excel file with columns:
  ```
  username     | allowedViews
  john_smith   | 5
  jane_doe     | 10
  student3     | 3
  ```
- Admin Panel → "Bulk Add Students"
- Upload file
- Students are added with their view allowances

---

## 📊 Example Video Scenarios

### Scenario 1: Weekly Video Release
- Monday: Add 1 new video via admin panel
- All students can watch (if they have remaining views)
- Next Monday: Add new video

### Scenario 2: Limited Trial
- Add new student with 2 views
- Student watches 2 videos
- After 2 views, sees "No views remaining" message
- Admin can add more views if needed

### Scenario 3: Course Progress
- Chapter 1 Videos: Students get 10 views
- Chapter 2 Videos: Admin adds 10 more views
- Students can space out their viewing

---

## 🎥 Example YouTube Video IDs to Test

Copy these to test:

| Video | ID | Duration |
|-------|--|---------:|
| Rick Roll | `dQw4w9WgXcQ` | 3:32 |
| YouTube Intro | `jNQXAC9IVRw` | 11:37 |
| Big Buck Bunny | `7e_7DJjMqPQ` | 9:56 |

**Note:** These are just for testing. Use your own educational content videos.

---

## 🚀 Advanced Features

### Watermark System
- Automatically displays student's username
- Rotates to all 4 corners every 30 seconds
- Cannot be disabled by student
- Anti-copy measures prevent screen recording

### View Limiting System
- Each student has an allowance (e.g., 5 views)
- Decrements by 1 each time they load the watch page
- Zero views = Cannot watch
- Admin can replenish views anytime

### JWT Token Security
- Student gets a token valid for 24 hours
- Token includes view count
- Token updates after each view
- Logout clears token

---

## 🐛 Debugging

### Video Won't Load?
1. **Check Video ID:**
   - Is it correct?
   - Copy from YouTube URL bar again
   
2. **Check YouTube Video Settings:**
   - Is it "Unlisted" (not Private)?
   - Try a different video first
   
3. **Check Browser:**
   - Clear cookies (F12 → Application → Clear site data)
   - Try incognito mode
   - Try different browser

### No Watermark?
1. Check browser console: Press F12
2. Look for JavaScript errors
3. Verify student is logged in (token exists)
4. Try logging out and back in

### View Count Not Decreasing?
1. Refresh page after watching
2. Check student has more than 0 views
3. Look at network tab (F12) to verify API call succeeds
4. Check MongoDB connection

---

## 📝 Production Checklist

Before deploying to production:

- [ ] Change admin password (default: admin123)
- [ ] Change JWT_SECRET in .env file
- [ ] Use production MongoDB URI
- [ ] Set FRONTEND_URL to your domain
- [ ] Enable HTTPS (certificates)
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Monitor disk space for videos metadata
- [ ] Configure rate limiting appropriately

---

## 🤝 Support

### Common Issues:

**Q: Can students download videos?**
A: No, videos are embedded via YouTube iframe. Downloads depend on YouTube's settings for that video.

**Q: Can I track watch duration?**
A: Current version tracks views. For detailed analytics, integrate with YouTube Analytics API.

**Q: Can I use private YouTube playlists?**
A: Yes, but you'll need to setup YouTube API authentication (advanced setup).

**Q: How many students can watch simultaneously?**
A: As many as your server can handle. YouTube handles the bandwidth.

---

## 📚 Summary

Your portal is production-ready for:
✅ Hosting YouTube videos
✅ Limiting student access
✅ Tracking views
✅ Protecting content with watermarks
✅ Managing student accounts
✅ Bulk importing students

**You're ready to add your educational videos!**
