const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({ credentials: true, origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/educational-portal';
if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not set. Falling back to local MongoDB at mongodb://localhost:27017/educational-portal. Atlas will not be connected.');
} else {
    console.log('Using MongoDB URI from environment');
}

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// ==================== SCHEMAS ====================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    uniqueCode: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },
    allowedViews: { type: Number, default: 0, min: 0 },
    perVideoViews: [{ video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' }, views: { type: Number, default: 0, min: 0 } }],
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    createdAt: { type: Date, default: Date.now }
});

const videoSettingsSchema = new mongoose.Schema({
    youtubeId: { type: String, default: '' },
    title: { type: String, default: 'Educational Video' },
    description: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

const videoSchema = new mongoose.Schema({
    youtubeId: { type: String, required: true },
    title: { type: String, default: 'Educational Video' },
    description: { type: String, default: '' },
    materialTitle: { type: String, default: '' },
    materialLink: { type: String, default: '' },
    materials: [{ title: { type: String, default: '' }, link: { type: String, default: '' } }],
    folders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }],
    viewCount: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    link: { type: String, required: true, trim: true },
    folders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const folderSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    folderType: { type: String, enum: ['video', 'quiz'], default: 'video' },
    createdAt: { type: Date, default: Date.now }
});

const tutorProfileSchema = new mongoose.Schema({
    name: { type: String, default: 'Eng: Nour Shehab' },
    about: { type: String, default: 'Experienced educator passionate about teaching...' },
    photoUrl: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const VideoSettings = mongoose.model('VideoSettings', videoSettingsSchema);
const TutorProfile = mongoose.model('TutorProfile', tutorProfileSchema);
const Folder = mongoose.model('Folder', folderSchema);
const Video = mongoose.model('Video', videoSchema);
const Quiz = mongoose.model('Quiz', quizSchema);

// ==================== MIDDLEWARE ====================
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch { res.status(403).json({ error: 'Invalid token' }); }
};

const requireStudent = (req, res, next) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' });
    next();
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

const generateUniqueCode = () => Math.random().toString(36).substring(2, 10).toUpperCase() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

const extractYouTubeId = (input) => {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

const buildMaterialsFromPayload = (payload) => {
    let rawMaterials = [];
    if (typeof payload.materials === 'string') {
        try {
            const parsed = JSON.parse(payload.materials);
            rawMaterials = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
        } catch {
            rawMaterials = [];
        }
    } else if (Array.isArray(payload.materials)) {
        rawMaterials = payload.materials;
    } else if (payload.materials && typeof payload.materials === 'object') {
        rawMaterials = [payload.materials];
    }

    if (rawMaterials.length > 0) {
        return rawMaterials.map(item => {
            const title = typeof item?.title === 'string' ? item.title.trim() : '';
            let link = typeof item?.link === 'string' ? item.link.trim() : '';
            if (link && !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(link)) {
                link = `https://${link}`;
            }
            return { title, link };
        }).filter(item => item.link);
    }

    const materialLink = typeof payload.materialLink === 'string' ? payload.materialLink.trim() : '';
    const materialTitle = typeof payload.materialTitle === 'string' ? payload.materialTitle.trim() : '';
    const normalizedLink = materialLink && !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(materialLink) ? `https://${materialLink}` : materialLink;
    return normalizedLink ? [{ title: materialTitle, link: normalizedLink }] : [];
};

const validateMaterials = (materials) => {
    for (const material of materials) {
        if (!material.link) continue;
        try {
            const parsed = new URL(material.link);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
        } catch {
            return false;
        }
    }
    return true;
};

const buildFallbackMaterials = (video) => {
    if (Array.isArray(video.materials) && video.materials.length > 0) {
        return video.materials;
    }
    if (video.materialLink) {
        return [{ title: video.materialTitle || 'Material', link: video.materialLink }];
    }
    return [];
};

const buildFolderTree = (folders, videos = []) => {
    const folderMap = {};
    folders.forEach(folder => {
        folderMap[folder._id.toString()] = { ...folder.toObject ? folder.toObject() : folder, children: [], videos: [] };
    });

    const roots = [];
    folders.forEach(folder => {
        const parentId = folder.parentFolder ? folder.parentFolder.toString() : null;
        if (parentId && folderMap[parentId]) {
            folderMap[parentId].children.push(folderMap[folder._id.toString()]);
        } else {
            roots.push(folderMap[folder._id.toString()]);
        }
    });

    const unassigned = [];
    videos.forEach(video => {
        const assignedIds = Array.isArray(video.folders) ? video.folders.map(f => f? f._id.toString() : null).filter(Boolean) : [];
        if (assignedIds.length === 0) {
            unassigned.push(video);
        } else {
            assignedIds.forEach(folderId => {
                if (folderMap[folderId]) {
                    folderMap[folderId].videos.push(video);
                }
            });
        }
    });

    return { folders: roots, unassignedVideos: unassigned };
};

const buildFolderTreeForQuizzes = (folders, quizzes = []) => {
    const folderMap = {};
    folders.forEach(folder => {
        folderMap[folder._id.toString()] = { ...folder.toObject ? folder.toObject() : folder, children: [], quizzes: [] };
    });

    const unassigned = [];
    quizzes.forEach(quiz => {
        const assignedIds = Array.isArray(quiz.folders) ? quiz.folders.map(f => f? f._id.toString() : null).filter(Boolean) : [];
        if (assignedIds.length === 0) {
            unassigned.push(quiz);
            return;
        }
        assignedIds.forEach(folderId => {
            if (folderMap[folderId]) {
                folderMap[folderId].quizzes.push(quiz);
            }
        });
    });

    const roots = [];
    folders.forEach(folder => {
        const parentId = folder.parentFolder ? folder.parentFolder.toString ? folder.parentFolder.toString() : '' : null;
        if (parentId && folderMap[parentId]) {
            folderMap[parentId].children.push(folderMap[folder._id.toString()]);
        } else {
            roots.push(folderMap[folder._id.toString()]);
        }
    });

    return { folders: roots, unassignedQuizzes: unassigned };
};

const collectDescendantFolderIds = async (folderId) => {
    const folders = [folderId];
    const children = await Folder.find({ parentFolder: folderId }).select('_id');
    for (const child of children) {
        folders.push(...await collectDescendantFolderIds(child._id));
    }
    return folders;
};

// Initialize default admin, video settings, tutor profile
const initData = async () => {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('Nour1324*#', 10);
        await User.create({ username: 'Nour', uniqueCode: generateUniqueCode(), passwordHash: hashedPassword, allowedViews: 0, role: 'admin' });
        console.log('Default admin created: Nour / Nour1324*#');
    }
    const settings = await VideoSettings.findOne();
    if (!settings) await VideoSettings.create({ youtubeId: 'M7lc1UVf-VE', title: 'Introduction to Course' });

    const existingVideoCount = await Video.countDocuments();
    if (existingVideoCount === 0) {
        const seedVideos = [
            { youtubeId: 'M7lc1UVf-VE', title: 'Introduction to Course', description: 'Available test video' }
        ];
        await Video.insertMany(seedVideos);
        console.log('Seeded default videos');
    }

    const profile = await TutorProfile.findOne();
    if (!profile) await TutorProfile.create({ name: 'Eng: Nour Shehab', about: 'Welcome! I am an engineering educator with over 10 years of experience.', photoUrl: '' });
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { code, password } = req.body;
        const user = await User.findOne({ uniqueCode: code, role: 'student' });
        if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.json({ token, user: { username: user.username, role: user.role } });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/setup-password', async (req, res) => {
    try {
        const { code, password } = req.body;
        if (!code || !password || password.length < 4) return res.status(400).json({ error: 'Password min 4 chars' });
        const user = await User.findOne({ uniqueCode: code, role: 'student' });
        if (!user) return res.status(404).json({ error: 'Invalid code' });
        if (user.passwordHash) return res.status(400).json({ error: 'Password already set' });
        user.passwordHash = await bcrypt.hash(password, 10);
        await user.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/change-password', authenticateJWT, requireStudent, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash)))
            return res.status(401).json({ error: 'Current password incorrect' });
        if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'New password min 4 chars' });
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await User.findOne({ username, role: 'admin' });
        if (!admin || !admin.passwordHash || !(await bcrypt.compare(password, admin.passwordHash)))
            return res.status(401).json({ error: 'Invalid admin credentials' });
        const token = jwt.sign({ id: admin._id, username: admin.username, role: admin.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.json({ token, user: { username: admin.username, role: admin.role } });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== STUDENT ROUTES ====================
app.get('/api/student/me', authenticateJWT, requireStudent, async (req, res) => {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json({ username: user.username, uniqueCode: user.uniqueCode, perVideoViews: user.perVideoViews });
});

app.post('/api/student/consume-view', authenticateJWT, requireStudent, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (user.allowedViews <= 0) return res.status(400).json({ error: 'No views remaining' });
    user.allowedViews -= 1;
    await user.save();
    const newToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.json({ success: true, remainingViews: user.allowedViews, newToken });
});

app.get('/api/student/video-settings', authenticateJWT, requireStudent, async (req, res) => {
    const settings = await VideoSettings.findOne();
    res.json(settings || { youtubeId: '', title: 'No video', description: '' });
});

app.get('/api/student/video-embed', authenticateJWT, requireStudent, async (req, res) => {
    const settings = await VideoSettings.findOne();
    const youtubeId = settings?.youtubeId || 'CvQ7e6yUtkw';
    if (!youtubeId || youtubeId.trim() === '') {
        return res.status(400).json({ error: 'No video configured' });
    }
    const embedHtml = `<iframe src="/embed.html?v=${youtubeId}" frameborder="0" referrerpolicy="origin" style="width:100%;height:100%"></iframe>`;
    res.json({ html: embedHtml });
});

// Return list of available videos for students
app.get('/api/videos', authenticateJWT, requireStudent, async (req, res) => {
    const videos = await Video.find().sort({ createdAt: -1 }).select('-__v');
    res.json(videos);
});

// Student consumes one view for a specific video and receives embed HTML
app.post('/api/student/consume-view-for-video', authenticateJWT, requireStudent, async (req, res) => {
    try {
        const { videoId } = req.body;
        if (!videoId) return res.status(400).json({ error: 'videoId required' });
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ error: 'Video not found' });

        // check per-video allocation first
        const per = user.perVideoViews.find(p => p.video && p.video.toString() === videoId.toString());
        let usedFromPerVideo = false;
        if (!per || per.views <= 0) {
            return res.status(400).json({ error: 'No views allocated for this video' });
        }
        per.views -= 1;

        video.viewCount = (video.viewCount || 0) + 1;
        await Promise.all([user.save(), video.save()]);

        const newToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        const embedHtml = `<iframe src="/embed.html?v=${video.youtubeId}" frameborder="0" referrerpolicy="origin" style="width:100%;height:100%"></iframe>`;
        res.json({
            success: true,
            remainingViews: user.allowedViews,
            newToken,
            embedHtml,
            video: {
                id: video._id,
                viewCount: video.viewCount,
                title: video.title,
                youtubeId: video.youtubeId,
                materials: buildFallbackMaterials(video)
            },
            usedFromPerVideo
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/students', authenticateJWT, requireAdmin, async (req, res) => {
    const students = await User.find({ role: 'student' }).select('-passwordHash');
    res.json(students);
});

app.get('/api/admin/folders', authenticateJWT, requireAdmin, async (req, res) => {
    const folders = await Folder.find().sort({ createdAt: 1 }).lean();
    res.json({ folders });
});

app.get('/api/admin/folders/tree', authenticateJWT, requireAdmin, async (req, res) => {
    const folders = await Folder.find().sort({ createdAt: 1 }).lean();
    const videos = await Video.find().populate('folders', 'name parentFolder').sort({ createdAt: -1 }).lean();
    const tree = buildFolderTree(folders, videos);
    res.json(tree);
});

app.post('/api/admin/folders', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { name, parentFolderId, folderType = 'video' } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Folder name is required' });
        }
        if (!['video', 'quiz'].includes(folderType)) {
            return res.status(400).json({ error: 'Invalid folder type. Use "video" or "quiz".' });
        }
        
        let parentFolder = null;
        if (parentFolderId && parentFolderId.trim && parentFolderId.trim() !== '') {
            if (!mongoose.Types.ObjectId.isValid(parentFolderId)) {
                return res.status(400).json({ error: 'Invalid parent folder ID format' });
            }
            parentFolder = await Folder.findById(parentFolderId);
            if (!parentFolder) {
                return res.status(404).json({ error: 'Parent folder not found' });
            }
            const parentType = parentFolder.folderType || 'video';
            if (parentType !== folderType) {
                return res.status(400).json({ error: 'Folder type must match parent folder type' });
            }
        }
        
        const folder = await Folder.create({ 
            name: name.trim(), 
            parentFolder: parentFolder ? parentFolder._id : null,
            folderType
        });
        
        res.json({ success: true, folder });
    } catch (err) {
        console.error('Folder creation error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

app.post('/api/admin/folders/:folderId', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { folderId } = req.params;
        const { name, parentFolderId, folderType } = req.body;
        if (!mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ error: 'Invalid folder ID' });
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        const currentType = folder.folderType || 'video';
        let updatedType = currentType;
        if (folderType !== undefined) {
            if (!['video', 'quiz'].includes(folderType)) {
                return res.status(400).json({ error: 'Invalid folder type. Use "video" or "quiz".' });
            }
            updatedType = folderType;
            if (folderType !== currentType) {
                const childIds = await collectDescendantFolderIds(folderId);
                const mismatchChild = await Folder.findOne({ _id: { $in: childIds }, folderType: { $exists: true, $ne: folderType } });
                if (mismatchChild) {
                    return res.status(400).json({ error: 'Cannot change folder type while child folders have a different type' });
                }
            }
        }
        if (name !== undefined) {
            if (!name || !name.trim()) return res.status(400).json({ error: 'Folder name cannot be empty' });
            folder.name = name.trim();
        }
        if (parentFolderId !== undefined) {
            if (parentFolderId && !mongoose.Types.ObjectId.isValid(parentFolderId)) return res.status(400).json({ error: 'Invalid parent folder ID' });
            if (parentFolderId && parentFolderId.toString() === folderId.toString()) return res.status(400).json({ error: 'Folder cannot be its own parent' });
            if (parentFolderId) {
                const parentFolder = await Folder.findById(parentFolderId);
                if (!parentFolder) return res.status(404).json({ error: 'Parent folder not found' });
                const parentType = parentFolder.folderType || 'video';
                if (parentType !== updatedType) {
                    return res.status(400).json({ error: 'Folder type must match parent folder type' });
                }
                const descendants = await collectDescendantFolderIds(folderId);
                if (descendants.find(id => id.toString() === parentFolderId.toString())) {
                    return res.status(400).json({ error: 'Cannot move folder under its own child' });
                }
                folder.parentFolder = parentFolder._id;
            } else {
                folder.parentFolder = null;
            }
        }
        if (folderType !== undefined) {
            folder.folderType = updatedType;
        }
        await folder.save();
        res.json({ success: true, folder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/folders/:folderId', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { folderId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ error: 'Invalid folder ID' });
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        const folderIds = await collectDescendantFolderIds(folder._id);
        await Folder.deleteMany({ _id: { $in: folderIds } });
        await Video.updateMany({ folders: { $in: folderIds } }, { $pull: { folders: { $in: folderIds } } });
        res.json({ success: true, deletedFolderCount: folderIds.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/videos/assign-folders', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { videoIds, folderIds } = req.body;
        if (!Array.isArray(videoIds) || videoIds.length === 0) return res.status(400).json({ error: 'videoIds required' });
        const validVideoIds = videoIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validVideoIds.length !== videoIds.length) return res.status(400).json({ error: 'One or more invalid videoIds' });
        const validFolderIds = Array.isArray(folderIds) ? folderIds.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
        const folders = await Folder.find({ _id: { $in: validFolderIds }, $or: [{ folderType: 'video' }, { folderType: { $exists: false } }] }).select('_id');
        if (validFolderIds.length !== folders.length) return res.status(400).json({ error: 'One or more invalid or non-video folderIds' });
        await Promise.all(validVideoIds.map(async videoId => {
            const video = await Video.findById(videoId);
            if (!video) return;
            video.folders = validFolderIds;
            await video.save();
        }));
        res.json({ success: true, assignedVideos: validVideoIds.length, assignedFolders: validFolderIds.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/student/folders', authenticateJWT, requireStudent, async (req, res) => {
    try {
        const folders = await Folder.find({ $or: [{ folderType: 'video' }, { folderType: { $exists: false } }] }).sort({ createdAt: 1 }).lean();
        let videos = await Video.find().populate('folders', 'name parentFolder').sort({ createdAt: -1 }).lean();
        videos = videos.map(video => ({
            ...video,
            materials: buildFallbackMaterials(video)
        }));
        const tree = buildFolderTree(folders, videos);
        res.json(tree);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/student/quizzes', authenticateJWT, requireStudent, async (req, res) => {
    try {
        const folders = await Folder.find({ folderType: 'quiz' }).sort({ createdAt: 1 }).lean();
        const quizzes = await Quiz.find().populate('folders', 'name parentFolder').sort({ createdAt: -1 }).lean();
        const tree = buildFolderTreeForQuizzes(folders, quizzes);
        res.json(tree);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/add-views', authenticateJWT, requireAdmin, async (req, res) => {
    res.status(400).json({ error: 'Global total views are disabled. Assign views to specific videos only.' });
});

// Add views for a specific student for a specific video
app.post('/api/admin/add-views-to-student-for-video', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { username, studentId, studentIds, videoId, videoIds, viewsToAdd } = req.body;
        console.log('ADMIN add-views request body:', { username, studentId, studentIds, videoId, videoIds, viewsToAdd });
        const views = parseInt(viewsToAdd, 10);
        if (Number.isNaN(views) || views < 1) return res.status(400).json({ error: 'viewsToAdd must be a positive number' });

        const requestedStudentIds = Array.isArray(studentIds) ? studentIds.filter(Boolean) : studentId ? [studentId] : [];
        if (username) requestedStudentIds.push(username);
        const uniqueStudentIds = [...new Set(requestedStudentIds)];
        if (uniqueStudentIds.length === 0) return res.status(400).json({ error: 'studentId or studentIds required' });

        const requestedVideoIds = Array.isArray(videoIds) ? videoIds.filter(Boolean) : videoId ? [videoId] : [];
        if (requestedVideoIds.length === 0) return res.status(400).json({ error: 'videoId or videoIds required' });

        const invalidVideoIds = requestedVideoIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidVideoIds.length) return res.status(400).json({ error: 'One or more invalid videoIds' });

        const videos = await Video.find({ _id: { $in: requestedVideoIds } });
        if (videos.length !== requestedVideoIds.length) return res.status(404).json({ error: 'One or more videos not found' });

        const students = [];
        for (const idOrUsername of uniqueStudentIds) {
            let user = null;
            if (mongoose.Types.ObjectId.isValid(idOrUsername)) {
                user = await User.findOne({ _id: idOrUsername, role: 'student' });
            }
            if (!user) {
                user = await User.findOne({ username: idOrUsername, role: 'student' });
            }
            if (!user) return res.status(404).json({ error: `Student not found: ${idOrUsername}` });
            students.push(user);
        }

        await Promise.all(students.map(async user => {
            videos.forEach(video => {
                const existing = user.perVideoViews.find(p => p.video && p.video.toString() === video._id.toString());
                if (existing) existing.views = (existing.views || 0) + views;
                else user.perVideoViews.push({ video: video._id, views });
            });
            await user.save();
        }));

        res.json({ success: true, updatedStudents: students.map(u => ({ _id: u._id, username: u.username })), updatedVideos: videos.map(v => ({ _id: v._id, title: v.title })) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/create-student', authenticateJWT, requireAdmin, async (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === '') return res.status(400).json({ error: 'Username required' });
    const existing = await User.findOne({ $or: [{ username }, { uniqueCode: username }] });
    if (existing) return res.status(400).json({ error: 'Student already exists' });
    const newStudent = await User.create({ username: username.trim(), uniqueCode: generateUniqueCode(), allowedViews: 0, role: 'student', passwordHash: null });
    res.json({ success: true, student: { username: newStudent.username, uniqueCode: newStudent.uniqueCode } });
});

app.post('/api/admin/video-settings', authenticateJWT, requireAdmin, async (req, res) => {
    let settings = await VideoSettings.findOne();
    if (!settings) settings = new VideoSettings();
    if (req.body.youtubeId !== undefined) settings.youtubeId = req.body.youtubeId;
    if (req.body.title !== undefined) settings.title = req.body.title;
    if (req.body.description !== undefined) settings.description = req.body.description;
    await settings.save();
    res.json({ success: true, settings });
});

app.post('/api/admin/videos', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const rawInput = req.body.youtubeId;
        const youtubeId = extractYouTubeId(rawInput);
        if (!youtubeId) {
            return res.status(400).json({ error: 'Valid YouTube ID or URL required' });
        }
        const existing = await Video.findOne({ youtubeId });
        if (existing) return res.status(400).json({ error: 'This video is already in the library' });

        const folderIds = Array.isArray(req.body.folderIds) ? req.body.folderIds.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
        if (Array.isArray(req.body.folderIds) && folderIds.length !== req.body.folderIds.length) {
            return res.status(400).json({ error: 'One or more invalid folder IDs provided' });
        }

        if (folderIds.length > 0) {
            const foundFolders = await Folder.find({ _id: { $in: folderIds }, $or: [{ folderType: 'video' }, { folderType: { $exists: false } }] }).select('_id');
            if (foundFolders.length !== folderIds.length) {
                return res.status(400).json({ error: 'One or more folders not found or not video folders' });
            }
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + youtubeId)}&format=json`;
        const resp = await fetch(oembedUrl, { method: 'GET' });
        if (!resp.ok) return res.status(400).json({ error: 'Video does not allow embedding or is invalid' });

        const materials = buildMaterialsFromPayload(req.body);
        if (!validateMaterials(materials)) {
            return res.status(400).json({ error: 'Each material link must be a valid URL starting with http:// or https://' });
        }
        const video = await Video.create({
            youtubeId,
            title: req.body.title || 'Untitled Video',
            description: req.body.description || '',
            materialTitle: materials[0]?.title || '',
            materialLink: materials[0]?.link || '',
            materials,
            folders: folderIds
        });
        res.json({ success: true, video });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Validate a YouTube video is embeddable using oEmbed, then update a Video document
app.post('/api/admin/update-video', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { videoId, youtubeId, title, description, folderIds, materials, materialTitle, materialLink } = req.body;
        if (!videoId || !youtubeId) return res.status(400).json({ error: 'videoId and youtubeId required' });

        // Validate embeddable via YouTube oEmbed
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + youtubeId)}&format=json`;
        const resp = await fetch(oembedUrl, { method: 'GET' });
        if (!resp.ok) return res.status(400).json({ error: 'Video does not allow embedding or is invalid' });

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ error: 'Video not found' });
        video.youtubeId = youtubeId;
        if (title !== undefined) video.title = title;
        if (description !== undefined) video.description = description;

        if (materials !== undefined || materialLink !== undefined) {
            const newMaterials = buildMaterialsFromPayload(req.body);
            if (!validateMaterials(newMaterials)) {
                return res.status(400).json({ error: 'Each material link must be a valid URL starting with http:// or https://' });
            }
            video.materials = newMaterials;
            video.materialTitle = newMaterials[0]?.title || '';
            video.materialLink = newMaterials[0]?.link || '';
        }

        if (folderIds !== undefined) {
            const validFolderIds = Array.isArray(folderIds) ? folderIds.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
            if (!Array.isArray(folderIds) || validFolderIds.length !== folderIds.length) {
                return res.status(400).json({ error: 'One or more invalid folder IDs provided' });
            }
            if (validFolderIds.length > 0) {
                const foundFolders = await Folder.find({ _id: { $in: validFolderIds }, $or: [{ folderType: 'video' }, { folderType: { $exists: false } }] }).select('_id');
                if (foundFolders.length !== validFolderIds.length) {
                    return res.status(400).json({ error: 'One or more folders not found or not video folders' });
                }
            }
            video.folders = validFolderIds;
        }

        await video.save();
        res.json({ success: true, video });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/video/:videoId', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(videoId)) return res.status(400).json({ error: 'Invalid videoId' });
        const result = await Video.findByIdAndDelete(videoId);
        if (!result) return res.status(404).json({ error: 'Video not found' });
        res.json({ success: true, message: 'Video deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/student/change-password', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { studentId, code, newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Password (min 4 chars) required' });

        let student = null;
        if (studentId) {
            if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ error: 'Invalid student ID' });
            student = await User.findOne({ _id: studentId, role: 'student' });
        } else if (code) {
            student = await User.findOne({ uniqueCode: code, role: 'student' });
        }

        if (!student) return res.status(404).json({ error: 'Student not found' });

        student.passwordHash = await bcrypt.hash(newPassword, 10);
        await student.save();
        res.json({ success: true, message: `Password changed for ${student.username}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/video-settings', authenticateJWT, requireAdmin, async (req, res) => {
    const settings = await VideoSettings.findOne();
    res.json(settings || { youtubeId: '', title: '', description: '' });
});

// Admin: list all videos
app.get('/api/admin/videos', authenticateJWT, requireAdmin, async (req, res) => {
    const videos = await Video.find().sort({ createdAt: -1 }).populate('folders', 'name parentFolder').select('-__v').lean();
    const normalized = videos.map(video => ({
        ...video,
        materials: buildFallbackMaterials(video)
    }));
    res.json(normalized);
});

app.get('/api/admin/quizzes', authenticateJWT, requireAdmin, async (req, res) => {
    const quizzes = await Quiz.find().sort({ createdAt: -1 }).populate('folders', 'name parentFolder').select('-__v').lean();
    res.json(quizzes);
});

app.post('/api/admin/quizzes', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { title, description, link, folderIds } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Quiz title is required' });
        if (!link || typeof link !== 'string' || !link.trim()) return res.status(400).json({ error: 'Quiz link is required' });
        let normalizedLink = link.trim();
        if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(normalizedLink)) {
            normalizedLink = `https://${normalizedLink}`;
        }
        try { new URL(normalizedLink); } catch { return res.status(400).json({ error: 'Invalid quiz link URL' }); }

        const validFolderIds = Array.isArray(folderIds) ? folderIds.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
        if (folderIds && validFolderIds.length !== folderIds.length) {
            return res.status(400).json({ error: 'One or more invalid folder IDs provided' });
        }
        if (validFolderIds.length > 0) {
            const foundFolders = await Folder.find({ _id: { $in: validFolderIds }, folderType: 'quiz' }).select('_id');
            if (foundFolders.length !== validFolderIds.length) {
                return res.status(400).json({ error: 'One or more folders not found or not quiz folders' });
            }
        }

        const quiz = await Quiz.create({
            title: title.trim(),
            description: description ? description.toString().trim() : '',
            link: normalizedLink,
            folders: validFolderIds
        });
        res.json({ success: true, quiz });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/quizzes/:quizId', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { quizId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });
        const result = await Quiz.findByIdAndDelete(quizId);
        if (!result) return res.status(404).json({ error: 'Quiz not found' });
        res.json({ success: true, message: 'Quiz deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/quizzes/:quizId', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const { quizId } = req.params;
        const { title, description, link, folderIds } = req.body;
        if (!mongoose.Types.ObjectId.isValid(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        if (title !== undefined) {
            if (!title || !title.trim()) return res.status(400).json({ error: 'Quiz title is required' });
            quiz.title = title.trim();
        }
        if (description !== undefined) {
            quiz.description = description.toString().trim();
        }
        if (link !== undefined) {
            let normalizedLink = link.trim();
            if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(normalizedLink)) {
                normalizedLink = `https://${normalizedLink}`;
            }
            try { new URL(normalizedLink); } catch { return res.status(400).json({ error: 'Invalid quiz link URL' }); }
            quiz.link = normalizedLink;
        }
        if (folderIds !== undefined) {
            const validFolderIds = Array.isArray(folderIds) ? folderIds.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
            if (!Array.isArray(folderIds) || validFolderIds.length !== folderIds.length) {
                return res.status(400).json({ error: 'One or more invalid folder IDs provided' });
            }
            if (validFolderIds.length > 0) {
                const foundFolders = await Folder.find({ _id: { $in: validFolderIds }, folderType: 'quiz' }).select('_id');
                if (foundFolders.length !== validFolderIds.length) {
                    return res.status(400).json({ error: 'One or more folders not found or not quiz folders' });
                }
            }
            quiz.folders = validFolderIds;
        }
        quiz.updatedAt = new Date();
        await quiz.save();
        res.json({ success: true, quiz });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Tutor Profile routes
app.get('/api/tutor/profile', async (req, res) => {
    const profile = await TutorProfile.findOne();
    res.json(profile || { name: 'Eng: Nour Shehab', about: '', photoUrl: '' });
});

app.post('/api/admin/tutor-profile', authenticateJWT, requireAdmin, async (req, res) => {
    let profile = await TutorProfile.findOne();
    if (!profile) profile = new TutorProfile();
    if (req.body.name !== undefined) profile.name = req.body.name;
    if (req.body.about !== undefined) profile.about = req.body.about;
    if (req.body.photoUrl !== undefined) profile.photoUrl = req.body.photoUrl;
    await profile.save();
    res.json({ success: true, profile });
});

// Excel upload
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/admin/upload-students', authenticateJWT, requireAdmin, upload.single('excelFile'), async (req, res) => {
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        const results = { added: 0, skipped: 0 };
        for (const row of data) {
            const username = row.username || row.Username;
            if (!username) continue;
            const existing = await User.findOne({ $or: [{ username }, { uniqueCode: username }] });
            if (existing) { results.skipped++; continue; }
            await User.create({ username: username.toString(), uniqueCode: generateUniqueCode(), allowedViews: 0, role: 'student', passwordHash: null });
            results.added++;
        }
        res.json({ success: true, added: results.added, skipped: results.skipped });
    } catch (err) { res.status(500).json({ error: 'Error processing file' }); }
});

app.delete('/api/admin/student/:username', authenticateJWT, requireAdmin, async (req, res) => {
    const result = await User.findOneAndDelete({ username: req.params.username, role: 'student' });
    if (!result) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true });
});

// ==================== SERVE FRONTEND ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));
app.get('/watch', (req, res) => res.sendFile(path.join(__dirname, 'public', 'watch.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initData();
    console.log(`Server running on port ${PORT}`);
    console.log('Made By Saif Hegazy (Faculty of Computers and Data Science Alexandria University) | Portfolio: https://saifhegazy1.github.io/Portfolio/');
});
