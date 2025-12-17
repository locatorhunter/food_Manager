// ========================================
// Auragram - Social Feed Functionality
// ========================================

document.addEventListener('DOMContentLoaded', function() {
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

function updateUserAvatar() {
    const user = window.authService.getCurrentUser();
    const avatarElement = document.getElementById('currentUserAvatar');

    if (user && avatarElement) {
        const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() :
                      user.email ? user.email.charAt(0).toUpperCase() : '?';
        avatarElement.textContent = initial;
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

function previewImage() {
    const imageInput = document.getElementById('imageInput');
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

        // Show loading indicator
        imagePreview.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIHN0cm9rZT0iI2NjYyIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1kYXNoYXJyYXk9IjEwLDEwIj48L2NpcmNsZT4KPHRleHQgeD0iMjAiIHk9IjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEwIj5Mb2FkaW5nPC90ZXh0Pgo8L3N2Zz4=';
        imagePreview.style.display = 'block';

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                // Try to create image for compression, fallback to direct preview
                let img;
                try {
                    img = new Image();
                } catch (imgError) {
                    console.warn('Image constructor failed, using direct preview:', imgError);
                    // Fallback: show original data directly
                    imagePreview.src = e.target.result;
                    return;
                }

                img.onload = () => {
                    try {
                        // Try to show compressed preview, fallback to original
                        let previewDataUrl;
                        try {
                            previewDataUrl = compressImage(img, file.type);
                        } catch (compressError) {
                            console.warn('Preview compression failed, using original:', compressError);
                            previewDataUrl = e.target.result; // Use original data
                        }
                        imagePreview.src = previewDataUrl;
                    } catch (error) {
                        console.error('Error creating preview:', error);
                        // Fallback: show original data
                        imagePreview.src = e.target.result;
                    }
                };

                img.onerror = () => {
                    console.warn('Image loading failed, using direct preview');
                    // Fallback: show original data directly
                    imagePreview.src = e.target.result;
                };

                // Try to set image source
                try {
                    img.src = e.target.result;
                } catch (srcError) {
                    console.warn('Setting img.src failed, using direct preview:', srcError);
                    // Fallback: show original data directly
                    imagePreview.src = e.target.result;
                }
            } catch (error) {
                console.error('Error in reader.onload:', error);
                // Final fallback: show original data directly
                try {
                    imagePreview.src = e.target.result;
                } catch (finalError) {
                    console.error('Even direct preview failed:', finalError);
                    showToast('Error displaying image preview.', 'error');
                    imagePreview.style.display = 'none';
                }
            }
        };

        reader.onerror = () => {
            showToast('Failed to read image file.', 'error');
            imagePreview.style.display = 'none';
        };

        reader.readAsDataURL(file);
    }
}

async function loadPosts() {
    try {
        const posts = await StorageManager.getPosts();
        const postsFeed = document.getElementById('postsFeed');

        if (posts.length === 0) {
            postsFeed.innerHTML = `
                <div class="empty-state">
                    <h3>📝 No posts yet</h3>
                    <p>Be the first to share something! Create a post above to get started.</p>
                </div>
            `;
            return;
        }

        const postsHtml = await Promise.all(posts.map(post => renderPost(post)));
        postsFeed.innerHTML = postsHtml.join('');

    } catch (error) {
        console.error('Error loading posts:', error);
        showToast('Error loading posts. Please refresh.', 'error');
    }
}

async function renderPost(post) {
    const user = window.authService.getCurrentUser();
    const isLiked = await StorageManager.hasUserReacted(post.id, user.uid);
    const comments = await StorageManager.getComments(post.id);

    const timeAgo = getTimeAgo(new Date(post.createdAt));

    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-user-avatar">${(post.userName || post.userEmail).charAt(0).toUpperCase()}</div>
                <div class="post-user-info">
                    <div class="post-username">${post.userName || post.userEmail}</div>
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
                    <div class="comment-avatar">${user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}</div>
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

function renderComment(comment) {
    const timeAgo = getTimeAgo(new Date(comment.createdAt));
    const user = window.authService.getCurrentUser();

    return `
        <div class="comment" data-comment-id="${comment.id}">
            <div class="comment-avatar">${(comment.userName || comment.userEmail).charAt(0).toUpperCase()}</div>
            <div class="comment-content">
                <p class="comment-text">
                    <strong>${comment.userName || comment.userEmail}:</strong> ${escapeHtml(comment.content)}
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

// Make functions globally available
window.createPost = createPost;
window.previewImage = previewImage;
window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.handleCommentKeydown = handleCommentKeydown;