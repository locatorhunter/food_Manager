// ========================================
// Auragram - Social Feed Functionality
// ========================================

// Profile cache to store user profiles for better performance
window.profileCache = {};

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const user = window.authService ? window.authService.getCurrentUser() : null;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize Auragram
    initializeAuragram();
});

async function initializeAuragram() {
    try {
        // Update user avatar
        updateUserAvatar();

        // Update current user comment avatar
        await updateCurrentUserCommentAvatar();

        // Load posts
        await loadPosts();

        // Set up real-time listeners
        setupRealtimeListeners();

        console.log('Auragram initialized successfully');
    } catch (error) {
        console.error('Error initializing Auragram:', error);
        showToast('Error loading Auragram. Please refresh.', 'error');
    }
}

async function updateCurrentUserCommentAvatar() {
    const user = window.authService.getCurrentUser();
    const avatarElement = document.getElementById('currentUserCommentAvatar');

    if (user && avatarElement) {
        try {
            const profile = await StorageManager.getUserProfile(user.uid);
            if (profile && profile.profilePhoto) {
                avatarElement.innerHTML = `<img src="${profile.profilePhoto}" alt="Your profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
                avatarElement.textContent = initial;
            }
        } catch (error) {
            console.error('Error updating comment avatar:', error);
            const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            avatarElement.textContent = initial;
        }
    }
}

async function updateUserAvatar() {
    const user = window.authService.getCurrentUser();
    const avatarElement = document.getElementById('currentUserAvatar');

    if (user && avatarElement) {
        try {
            const profile = await StorageManager.getUserProfile(user.uid);
            if (profile && profile.profilePhoto) {
                avatarElement.innerHTML = `<img src="${profile.profilePhoto}" alt="Your profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                avatarElement.style.background = 'none';
            } else {
                const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() :
                    user.email ? user.email.charAt(0).toUpperCase() : '?';
                avatarElement.textContent = initial;
                avatarElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        } catch (error) {
            console.error('Error updating user avatar:', error);
            const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() :
                user.email ? user.email.charAt(0).toUpperCase() : '?';
            avatarElement.textContent = initial;
        }
    }
}

async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const imageInput = document.getElementById('imageInput');
    const postButton = document.getElementById('postButton');
    const postButtonText = document.getElementById('postButtonText');
    const postButtonLoading = document.getElementById('postButtonLoading');

    if (!content && !imageInput.files[0]) {
        showToast('Please add some text or an image to your post', 'warning');
        return;
    }

    // Show loading state
    postButton.disabled = true;
    postButtonText.style.display = 'none';
    postButtonLoading.style.display = 'inline';

    try {
        const user = window.authService.getCurrentUser();
        const postData = {
            userId: user.uid,
            userName: user.displayName || user.name || user.email,
            userEmail: user.email,
            content: content,
            imageUrl: null,
            likes: 0,
            comments: 0
        };

        // Handle image upload if present
        if (imageInput.files[0]) {
            try {
                console.log('Starting image upload...');
                const imageUrl = await uploadImage(imageInput.files[0]);
                postData.imageUrl = imageUrl;
                console.log('Image uploaded successfully, length:', imageUrl.length);
            } catch (imageError) {
                console.error('Image upload failed:', imageError);
                showToast(imageError.message || 'Failed to upload image. Please try again.', 'error');
                return;
            }
        }

        // Create post
        console.log('Creating post...');
        await StorageManager.addPost(postData);
        console.log('Post created successfully');

        // Clear form
        document.getElementById('postContent').value = '';
        imageInput.value = '';
        document.getElementById('imagePreview').style.display = 'none';

        showToast('Post created successfully!', 'success');

        // Reload posts
        await loadPosts();

    } catch (error) {
        console.error('Error creating post:', error);
        const errorMessage = error.message || 'Error creating post. Please try again.';
        showToast(errorMessage, 'error');
    } finally {
        // Hide loading state
        postButton.disabled = false;
        postButtonText.style.display = 'inline';
        postButtonLoading.style.display = 'none';
    }
}

async function uploadImage(file) {
    return new Promise((resolve, reject) => {
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            reject(new Error('Image file is too large. Please choose an image smaller than 5MB.'));
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('Please select a valid image file.'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                // Try to create image for compression, fallback to original data
                let img;
                try {
                    img = new Image();
                } catch (imgError) {
                    console.warn('Image constructor failed, using original data:', imgError);
                    // Check size and resolve with original data
                    if (e.target.result.length > 8000000) {
                        reject(new Error('Image file is too large. Please choose a smaller image.'));
                        return;
                    }
                    resolve(e.target.result);
                    return;
                }

                img.onload = () => {
                    try {
                        // Try to compress image, fallback to original if compression fails
                        let finalDataUrl;
                        try {
                            finalDataUrl = compressImage(img, file.type);
                            console.log('Image compression successful');
                        } catch (compressError) {
                            console.warn('Image compression failed, using original:', compressError);
                            finalDataUrl = e.target.result; // Use original data
                        }

                        // Check if final base64 string is too long
                        if (finalDataUrl.length > 8000000) { // ~8MB limit for safety
                            reject(new Error('Image is too large even after compression. Please choose a smaller image.'));
                            return;
                        }

                        resolve(finalDataUrl);
                    } catch (error) {
                        reject(new Error('Failed to process image: ' + error.message));
                    }
                };

                img.onerror = () => {
                    console.warn('Image loading failed, using original data');
                    // Check size and resolve with original data
                    if (e.target.result.length > 8000000) {
                        reject(new Error('Image file is too large. Please choose a smaller image.'));
                        return;
                    }
                    resolve(e.target.result);
                };

                // Try to set image source
                try {
                    img.src = e.target.result;
                } catch (srcError) {
                    console.warn('Setting img.src failed, using original data:', srcError);
                    // Check size and resolve with original data
                    if (e.target.result.length > 8000000) {
                        reject(new Error('Image file is too large. Please choose a smaller image.'));
                        return;
                    }
                    resolve(e.target.result);
                }
            } catch (error) {
                reject(new Error('Error processing image file: ' + error.message));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read image file. Please try again.'));
        };

        // Add timeout
        setTimeout(() => {
            reject(new Error('Image upload timed out. Please try again.'));
        }, 30000); // 30 second timeout

        reader.readAsDataURL(file);
    });
}

function compressImage(img, mimeType) {
    try {
        // Check if canvas is supported
        if (typeof document === 'undefined' || !document.createElement) {
            console.warn('Canvas not supported, skipping compression');
            return img.src; // Return original if canvas not available
        }

        const canvas = document.createElement('canvas');
        if (!canvas || !canvas.getContext) {
            console.warn('Canvas element not supported, skipping compression');
            return img.src; // Return original if canvas not available
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Canvas 2D context not available, skipping compression');
            return img.src; // Return original if context not available
        }

        // Calculate new dimensions (max 1200px width/height)
        const maxDimension = 1200;
        let { width, height } = img;

        if (width > height) {
            if (width > maxDimension) {
                height = (height * maxDimension) / width;
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = (width * maxDimension) / height;
                height = maxDimension;
            }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Return compressed base64 (quality: 0.8 for good balance)
        const compressed = canvas.toDataURL(mimeType, 0.8);
        console.log('Image compressed successfully');
        return compressed;
    } catch (error) {
        console.error('Error compressing image:', error);
        // Return original image data if compression fails
        return img.src;
    }
}

// Pagination State
let allPosts = [];
let displayedPostsCount = 0;
const POSTS_PER_PAGE = 10;

function renderSkeletonPosts() {
    const skeletonPosts = [];
    for (let i = 0; i < 3; i++) {
        skeletonPosts.push(`
            <div class="skeleton-post">
                <div class="skeleton-post-header">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton-user-info">
                        <div class="skeleton skeleton-username"></div>
                        <div class="skeleton skeleton-timestamp"></div>
                    </div>
                </div>
                <div class="skeleton-post-content">
                    <div class="skeleton skeleton-text skeleton-long"></div>
                    <div class="skeleton skeleton-text skeleton-medium"></div>
                    <div class="skeleton skeleton-text skeleton-short"></div>
                    <div class="skeleton skeleton-image"></div>
                </div>
                <div class="skeleton-post-actions">
                    <div class="skeleton skeleton-action"></div>
                    <div class="skeleton skeleton-action"></div>
                </div>
            </div>
        `);
    }
    return skeletonPosts.join('');
}

async function loadPosts() {
    const postsFeed = document.getElementById('postsFeed');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    // Only show skeleton if we are loading from scratch
    if (displayedPostsCount === 0) {
        postsFeed.innerHTML = renderSkeletonPosts();
    }

    try {
        // Fetch all posts (since backend doesn't support pagination yet)
        allPosts = await StorageManager.getPosts();

        if (allPosts.length === 0) {
            postsFeed.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📝</span>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something! Create a post above to get started.</p>
                </div>
            `;
            loadMoreContainer.style.display = 'none';
            return;
        }

        // Reset display count if we are reloading everything (e.g. after a new post)
        // But if this is a "refresh", we might want to keep current view. 
        // For simplicity, let's reset on full reload, or we could handle it differently.
        // If this function is called from "Realtime Listener", we probably want to update the feed smartly.
        // For now, let's render the first chunk.

        displayedPostsCount = 0;
        postsFeed.innerHTML = ''; // Clear skeleton

        await renderNextBatch();

    } catch (error) {
        console.error('Error loading posts:', error);
        showToast('Error loading posts. Please refresh.', 'error');
        postsFeed.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">❌</span>
                <h3>Error loading posts</h3>
                <p>Please refresh the page to try again.</p>
            </div>
        `;
    }
}

async function renderNextBatch() {
    const postsFeed = document.getElementById('postsFeed');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    const nextBatch = allPosts.slice(displayedPostsCount, displayedPostsCount + POSTS_PER_PAGE);

    if (nextBatch.length === 0) {
        loadMoreContainer.style.display = 'none';
        return;
    }

    // Render posts
    const postsHtml = [];
    for (const post of nextBatch) {
        const postHtml = await renderPost(post);
        postsHtml.push(postHtml);
    }

    // Append to feed
    // We create a temporary container to append nicely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = postsHtml.join('');

    // Move children to postsFeed
    while (tempDiv.firstChild) {
        postsFeed.appendChild(tempDiv.firstChild);
    }

    displayedPostsCount += nextBatch.length;

    // Show/Hide Load More button
    if (displayedPostsCount < allPosts.length) {
        loadMoreContainer.style.display = 'block';
        loadMoreBtn.textContent = 'Load More Posts';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

async function loadMorePosts() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    loadMoreBtn.textContent = 'Loading...';
    await renderNextBatch();
}

function removeImage() {
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');

    imageInput.value = ''; // Clear file input
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
}

// Override previewImage to handle the new container
function previewImage() {
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');

    if (imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
            return;
        }

        // Validate file size
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showToast('Image file is too large. Please choose an image smaller than 5MB.', 'error');
            return;
        }

        // Show container and loading
        imagePreviewContainer.style.display = 'block';
        imagePreview.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIHN0cm9rZT0iI2NjYyIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1kYXNoYXJyYXk9IjEwLDEwIj48L2NpcmNsZT4KPHRleHQgeD0iMjAiIHk9IjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEwIj5Mb2FkaW5nPC90ZXh0Pgo8L3N2Zz4=';

        const reader = new FileReader();

        reader.onload = (e) => {
            // ... existing compression logic ...
            // For brevity in this large replacement, I'll use the existing compression logic structure 
            // but call a helper or just inline it if needed. 
            // To be safe and precise, I will copy the compression logic from the original file roughly.

            handleImageProcessing(file, e.target.result, imagePreview);
        };

        reader.readAsDataURL(file);
    }
}

// Helper to keep the compression logic separate and clean
function handleImageProcessing(file, originalResult, imagePreviewElement) {
    try {
        let img = new Image();
        img.onload = () => {
            try {
                let previewDataUrl = compressImage(img, file.type);
                imagePreviewElement.src = previewDataUrl;
            } catch (error) {
                console.warn('Preview compression failed:', error);
                imagePreviewElement.src = originalResult;
            }
        };
        img.onerror = () => { imagePreviewElement.src = originalResult; };
        img.src = originalResult;
    } catch (e) {
        imagePreviewElement.src = originalResult;
    }
}

async function renderPost(post) {
    const user = window.authService.getCurrentUser();
    const isLiked = await StorageManager.hasUserReacted(post.id, user.uid);
    const comments = await StorageManager.getComments(post.id);

    const timeAgo = getTimeAgo(new Date(post.createdAt));

    // Get user profile for profile photo
    const userProfile = await getUserProfileForPost(post.userId);
    const displayNameResult = userProfile && userProfile.displayName ? userProfile.displayName : (post.userName || 'User');
    const handleResult = userProfile && userProfile.email ? userProfile.email.split('@')[0] : (post.userEmail ? post.userEmail.split('@')[0] : 'user');
    const displayHandle = `@${handleResult.toLowerCase()}`;
    const avatarHtml = renderUserAvatar(userProfile, displayNameResult);

    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div onclick="viewUserProfile('${post.userId}', '${escapeHtml(displayNameResult)}')">
                    ${avatarHtml}
                </div>
                <div class="post-user-info">
                    <div class="post-display-name" onclick="viewUserProfile('${post.userId}', '${escapeHtml(displayNameResult)}')">${escapeHtml(displayNameResult)}</div>
                    <div class="post-handle" onclick="viewUserProfile('${post.userId}', '${escapeHtml(displayNameResult)}')">${escapeHtml(displayHandle)}</div>
                    <div class="post-timestamp">${timeAgo}</div>
                </div>
                ${post.userId === user.uid ? `
                    <button class="action-button" onclick="deletePost('${post.id}')" title="Delete post">
                        🗑️
                    </button>
                ` : ''}
            </div>

            <div class="post-content">
                ${post.content ? `<p class="post-text">${escapeHtml(post.content)}</p>` : ''}
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
            </div>

            <div class="post-actions-bar">
                <button class="action-button ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    ❤️ ${post.likes || 0}
                </button>
                <button class="action-button" onclick="toggleComments('${post.id}')">
                    💬 ${post.comments || 0}
                </button>
            </div>

            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                <div id="comments-list-${post.id}">
                    ${comments.map(comment => renderComment(comment)).join('')}
                </div>

                <div class="add-comment">
                    <div class="comment-avatar" id="currentUserCommentAvatar">${user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}</div>
                    <textarea
                        class="comment-input"
                        id="comment-input-${post.id}"
                        placeholder="Write a comment..."
                        maxlength="500"
                        onkeydown="handleCommentKeydown(event, '${post.id}')"></textarea>
                    <button class="btn btn-primary btn-small" onclick="addComment('${post.id}')">Post</button>
                </div>
            </div>
        </div>
    `;
}

async function getUserProfileForPost(userId) {
    // Check cache first
    if (window.profileCache[userId]) {
        return window.profileCache[userId];
    }

    try {
        const profile = await StorageManager.getUserProfile(userId);
        // Cache the profile
        window.profileCache[userId] = profile;
        return profile;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

function renderUserAvatar(profile, fallbackName) {
    if (profile && profile.profilePhoto) {
        return `<img src="${profile.profilePhoto}" alt="Profile" class="post-user-avatar" style="object-fit: cover;">`;
    } else {
        const initial = (profile?.displayName || fallbackName || 'U').charAt(0).toUpperCase();
        return `<div class="post-user-avatar">${initial}</div>`;
    }
}

async function renderCurrentUserCommentAvatar() {
    const user = window.authService.getCurrentUser();
    const profile = await getUserProfileForPost(user.uid);

    if (profile && profile.profilePhoto) {
        return `<img src="${profile.profilePhoto}" alt="Your profile" class="comment-avatar" style="object-fit: cover;">`;
    } else {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        return `<div class="comment-avatar">${initial}</div>`;
    }
}

async function renderComment(comment) {
    const timeAgo = getTimeAgo(new Date(comment.createdAt));
    const user = window.authService.getCurrentUser();

    // Get user profile for profile photo
    const userProfile = await getUserProfileForPost(comment.userId);
    let avatarHtml;

    if (userProfile && userProfile.profilePhoto) {
        avatarHtml = `<img src="${userProfile.profilePhoto}" alt="Profile" class="comment-avatar" style="object-fit: cover;">`;
    } else {
        const initial = (comment.userName || comment.userEmail || 'U').charAt(0).toUpperCase();
        avatarHtml = `<div class="comment-avatar">${initial}</div>`;
    }

    return `
        <div class="comment" data-comment-id="${comment.id}">
            <div onclick="viewUserProfile('${comment.userId}')">
                ${avatarHtml}
            </div>
            <div class="comment-content">
                <p class="comment-text">
                    <span class="comment-username" onclick="viewUserProfile('${comment.userId}')">${comment.userName || comment.userEmail}</span>: ${escapeHtml(comment.content)}
                </p>
                <div class="comment-meta">
                    ${timeAgo}
                    ${comment.userId === user.uid ? ` • <button class="action-button" onclick="deleteComment('${comment.postId}', '${comment.id}')" style="font-size: 12px; padding: 2px 6px;">Delete</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

async function toggleLike(postId) {
    try {
        const user = window.authService.getCurrentUser();
        const isLiked = await StorageManager.hasUserReacted(postId, user.uid);

        if (isLiked) {
            await StorageManager.removeReaction(postId, user.uid);
            showToast('Removed like', 'info');
        } else {
            await StorageManager.addReaction(postId, user.uid);
            showToast('Liked post!', 'success');
        }

        // Reload posts to update counts
        await loadPosts();

    } catch (error) {
        console.error('Error toggling like:', error);
        showToast('Error updating like. Please try again.', 'error');
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
        commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    }
}

async function addComment(postId) {
    const commentInput = document.getElementById(`comment-input-${postId}`);
    const content = commentInput.value.trim();

    if (!content) {
        showToast('Please enter a comment', 'warning');
        return;
    }

    try {
        const user = window.authService.getCurrentUser();
        const commentData = {
            userId: user.uid,
            userName: user.displayName || user.name || user.email,
            userEmail: user.email,
            content: content
        };

        await StorageManager.addComment(postId, commentData);

        // Clear input
        commentInput.value = '';

        // Reload posts to update comments
        await loadPosts();

        // Re-open comments section
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (commentsSection) {
            commentsSection.style.display = 'block';
        }

        showToast('Comment added!', 'success');

    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Error adding comment. Please try again.', 'error');
    }
}

function handleCommentKeydown(event, postId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        addComment(postId);
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }

    try {
        await StorageManager.deletePost(postId);
        showToast('Post deleted successfully', 'success');
        await loadPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('Error deleting post. Please try again.', 'error');
    }
}

async function deleteComment(postId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }

    try {
        await StorageManager.deleteComment(postId, commentId);
        showToast('Comment deleted successfully', 'success');
        await loadPosts();
    } catch (error) {
        console.error('Error deleting comment:', error);
        showToast('Error deleting comment. Please try again.', 'error');
    }
}

function setupRealtimeListeners() {
    // Listen for new posts
    const postsRef = firebaseRef(StorageManager.PATHS.OFFISOGRAM_POSTS);
    firebaseOnValue(postsRef, () => {
        loadPosts();
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function openProfileModal() {
    try {
        const user = window.authService.getCurrentUser();
        if (!user) {
            showToast('Please log in to view your profile', 'warning');
            return;
        }

        // Always reset to default "My Profile" state first (editable)
        resetModalToMyProfile();

        // Load user profile
        await loadUserProfile();

        // Load user's posts
        await loadUserPosts();

        // Show modal
        document.getElementById('profileModal').style.display = 'block';
    } catch (error) {
        console.error('Error opening profile modal:', error);
        showToast('Error loading profile. Please try again.', 'error');
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('profileModal');
    if (event.target == modal) {
        closeProfileModal();
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
    // Clear any unsaved changes
    clearProfileForm();

    // Reset modal to my profile mode
    resetModalToMyProfile();
}



async function loadOtherUserProfile(userId, fallbackName) {
    try {
        const profile = await StorageManager.getUserProfile(userId);

        // ALWAYS update the DOM, even if profile is missing (use fallback)
        const displayName = (profile && profile.displayName) ? profile.displayName : (fallbackName || 'User');
        const bio = (profile && profile.bio) ? profile.bio : '';
        const email = (profile && profile.email) ? profile.email : '';

        // Update modal title
        document.querySelector('#profileModal .modal-header h2').textContent = `👤 ${displayName}'s Profile`;

        // Toggle Class for View Only Mode (Redundant check but safe)
        document.querySelector('.profile-modal-content').classList.add('view-only');

        // Disable inputs
        document.getElementById('displayName').disabled = true;
        document.getElementById('bio').disabled = true;

        // Update form fields
        document.getElementById('displayName').value = displayName;
        document.getElementById('bio').value = bio;

        // Update profile photo
        const photoPreview = document.getElementById('profilePhotoPreview');
        const photoPlaceholder = document.getElementById('profilePhotoPlaceholder');
        const photoInitial = document.getElementById('profilePhotoInitial');

        if (profile && profile.profilePhoto) {
            photoPreview.src = profile.profilePhoto;
            photoPreview.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        } else {
            photoPreview.style.display = 'none';
            photoPlaceholder.style.display = 'flex';
            photoInitial.textContent = displayName.charAt(0).toUpperCase();
        }

        // Load user's posts
        await loadOtherUserPosts(userId);

    } catch (error) {
        console.error('Error loading other user profile:', error);
        showToast('Error loading profile data', 'error');
    }
}

async function loadOtherUserPosts(userId) {
    try {
        const userPosts = await StorageManager.getUserPosts(userId);
        const userPostsList = document.getElementById('userPostsList');

        if (userPosts.length === 0) {
            userPostsList.innerHTML = '<div class="no-posts-message">No posts yet.</div>';
            return;
        }

        const postsHtml = userPosts.map(post => {
            const timeAgo = getTimeAgo(new Date(post.createdAt));
            return `
                <div class="user-post-item">
                    <div class="user-post-content">${escapeHtml(post.content || '')}</div>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="user-post-image">` : ''}
                    <div class="user-post-meta">
                        ❤️ ${post.likes || 0} likes • 💬 ${post.comments || 0} comments • ${timeAgo}
                    </div>
                </div>
            `;
        }).join('');

        userPostsList.innerHTML = postsHtml;
    } catch (error) {
        console.error('Error loading other user posts:', error);
        document.getElementById('userPostsList').innerHTML = '<div class="no-posts-message">Error loading posts</div>';
    }
}

function resetModalToMyProfile() {
    // Reset modal title
    document.querySelector('#profileModal .modal-header h2').textContent = '👤 My Profile';

    // Remove View Only Mode Class
    document.querySelector('.profile-modal-content').classList.remove('view-only');

    // Enable inputs
    document.getElementById('displayName').disabled = false;
    document.getElementById('bio').disabled = false;

    // Explicitly show controls if needed (CSS class removal should handle it)
    document.getElementById('profilePhotoInput').style.display = '';
    document.querySelector('.profile-photo-upload-btn').style.display = '';
    document.getElementById('saveProfileBtn').style.display = '';
}

async function loadUserProfile() {
    try {
        const user = window.authService.getCurrentUser();
        const profile = await StorageManager.getUserProfile(user.uid);

        if (profile) {
            // Update form fields
            document.getElementById('displayName').value = profile.displayName || '';
            document.getElementById('bio').value = profile.bio || '';

            // Update profile photo
            const photoPreview = document.getElementById('profilePhotoPreview');
            const photoPlaceholder = document.getElementById('profilePhotoPlaceholder');
            const photoInitial = document.getElementById('profilePhotoInitial');

            if (profile.profilePhoto) {
                photoPreview.src = profile.profilePhoto;
                photoPreview.style.display = 'block';
                photoPlaceholder.style.display = 'none';
            } else {
                photoPreview.style.display = 'none';
                photoPlaceholder.style.display = 'flex';
                photoInitial.textContent = (profile.displayName || profile.email || 'U').charAt(0).toUpperCase();
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Error loading profile data', 'error');
    }
}

async function loadUserPosts() {
    try {
        const user = window.authService.getCurrentUser();
        const userPosts = await StorageManager.getUserPosts(user.uid);
        const userPostsList = document.getElementById('userPostsList');

        if (userPosts.length === 0) {
            userPostsList.innerHTML = '<div class="no-posts-message">No posts yet. Create your first post above!</div>';
            return;
        }

        const postsHtml = userPosts.map(post => {
            const timeAgo = getTimeAgo(new Date(post.createdAt));
            return `
                <div class="user-post-item">
                    <div class="user-post-content">${escapeHtml(post.content || '')}</div>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="user-post-image">` : ''}
                    <div class="user-post-meta">
                        ❤️ ${post.likes || 0} likes • 💬 ${post.comments || 0} comments • ${timeAgo}
                    </div>
                </div>
            `;
        }).join('');

        userPostsList.innerHTML = postsHtml;
    } catch (error) {
        console.error('Error loading user posts:', error);
        document.getElementById('userPostsList').innerHTML = '<div class="no-posts-message">Error loading posts</div>';
    }
}

function previewProfilePhoto() {
    const imageInput = document.getElementById('profilePhotoInput');
    const imagePreview = document.getElementById('profilePhotoPreview');
    const imagePlaceholder = document.getElementById('profilePhotoPlaceholder');

    if (imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
            return;
        }

        // Validate file size (max 2MB for profile photos)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            showToast('Image file is too large. Please choose an image smaller than 2MB.', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                // Create image element safely
                let img;
                try {
                    img = new window.Image();
                } catch (imgError) {
                    console.warn('Image constructor failed, using direct preview:', imgError);
                    // Fallback to original image
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    imagePlaceholder.style.display = 'none';
                    window.profilePhotoData = e.target.result;
                    return;
                }

                img.onload = () => {
                    try {
                        // Check if canvas is available
                        if (typeof document === 'undefined' || !document.createElement) {
                            console.warn('Canvas not supported, using original image');
                            imagePreview.src = e.target.result;
                            imagePreview.style.display = 'block';
                            imagePlaceholder.style.display = 'none';
                            window.profilePhotoData = e.target.result;
                            return;
                        }

                        // Compress image for profile photo
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            console.warn('Canvas context not available, using original image');
                            imagePreview.src = e.target.result;
                            imagePreview.style.display = 'block';
                            imagePlaceholder.style.display = 'none';
                            window.profilePhotoData = e.target.result;
                            return;
                        }

                        // Set profile photo dimensions (square)
                        const size = 200;
                        canvas.width = size;
                        canvas.height = size;

                        // Create square crop
                        const minDimension = Math.min(img.width, img.height);
                        const sx = (img.width - minDimension) / 2;
                        const sy = (img.height - minDimension) / 2;

                        ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

                        // Convert to compressed JPEG
                        const compressed = canvas.toDataURL('image/jpeg', 0.8);
                        imagePreview.src = compressed;
                        imagePreview.style.display = 'block';
                        imagePlaceholder.style.display = 'none';

                        // Store the compressed image data for saving
                        window.profilePhotoData = compressed;
                    } catch (error) {
                        console.error('Error processing profile photo:', error);
                        // Fallback to original
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                        imagePlaceholder.style.display = 'none';
                        window.profilePhotoData = e.target.result;
                    }
                };

                img.onerror = () => {
                    console.warn('Image loading failed for profile photo');
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    imagePlaceholder.style.display = 'none';
                    window.profilePhotoData = e.target.result;
                };

                // Set image source safely
                try {
                    img.src = e.target.result;
                } catch (srcError) {
                    console.warn('Setting img.src failed, using direct preview:', srcError);
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    imagePlaceholder.style.display = 'none';
                    window.profilePhotoData = e.target.result;
                }
            } catch (error) {
                console.error('Error in profile photo reader:', error);
                // Final fallback
                try {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    imagePlaceholder.style.display = 'none';
                    window.profilePhotoData = e.target.result;
                } catch (finalError) {
                    console.error('Even direct preview failed:', finalError);
                    showToast('Error processing image. Please try again.', 'error');
                }
            }
        };

        reader.onerror = () => {
            showToast('Failed to read image file.', 'error');
        };

        reader.readAsDataURL(file);
    }
}

async function saveProfile() {
    const saveBtn = document.getElementById('saveProfileBtn');
    const saveText = document.getElementById('saveProfileText');
    const saveLoading = document.getElementById('saveProfileLoading');

    // Show loading state
    saveBtn.disabled = true;
    saveText.style.display = 'none';
    saveLoading.style.display = 'inline';

    try {
        const user = window.authService.getCurrentUser();
        const displayName = document.getElementById('displayName').value.trim();
        const bio = document.getElementById('bio').value.trim();

        if (!displayName) {
            showToast('Display name is required', 'warning');
            return;
        }

        if (displayName.length > 50) {
            showToast('Display name must be 50 characters or less', 'warning');
            return;
        }

        if (bio.length > 200) {
            showToast('Bio must be 200 characters or less', 'warning');
            return;
        }

        const updates = {
            displayName: displayName,
            bio: bio
        };

        // Add profile photo if changed
        if (window.profilePhotoData) {
            updates.profilePhoto = window.profilePhotoData;
        }

        await StorageManager.updateUserProfile(user.uid, updates);

        // Update the current user avatar in the main interface
        await updateUserAvatar();
        await updateCurrentUserCommentAvatar();

        // Clear the profile photo data
        window.profilePhotoData = null;
        document.getElementById('profilePhotoInput').value = '';

        showToast('Profile updated successfully!', 'success');
        closeProfileModal();

    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Error saving profile. Please try again.', 'error');
    } finally {
        // Hide loading state
        saveBtn.disabled = false;
        saveText.style.display = 'inline';
        saveLoading.style.display = 'none';
    }
}

function clearProfileForm() {
    document.getElementById('displayName').value = '';
    document.getElementById('bio').value = '';
    document.getElementById('profilePhotoInput').value = '';
    window.profilePhotoData = null;

    // Reset photo display
    const photoPreview = document.getElementById('profilePhotoPreview');
    const photoPlaceholder = document.getElementById('profilePhotoPlaceholder');
    photoPreview.style.display = 'none';
    photoPlaceholder.style.display = 'flex';
}

// Make functions globally available
window.createPost = createPost;
window.previewImage = previewImage;
window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.handleCommentKeydown = handleCommentKeydown;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewProfilePhoto = previewProfilePhoto;
window.saveProfile = saveProfile;
window.viewUserProfile = viewUserProfile;

async function viewUserProfile(userId, userName) {
    console.log('viewUserProfile called with ID:', userId);
    try {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.error('Invalid user ID passed to viewUserProfile:', userId);
            showToast('Cannot view profile: Invalid User ID', 'error');
            return;
        }

        const currentUser = window.authService.getCurrentUser();
        console.log('Current User ID:', currentUser ? currentUser.uid : 'Not logged in');

        // If viewing own profile, use the existing function
        if (currentUser && userId === currentUser.uid) {
            console.log('Viewing own profile');
            await openProfileModal();
            return;
        }

        console.log('Viewing other profile');

        // Apply View Only Mode immediately
        document.querySelector('.profile-modal-content').classList.add('view-only');

        // Load other user's profile
        await loadOtherUserProfile(userId, userName);

        // Show modal
        document.getElementById('profileModal').style.display = 'block';
    } catch (error) {
        console.error('Error viewing user profile:', error);
        showToast('Error loading profile. Please try again.', 'error');
    }
}