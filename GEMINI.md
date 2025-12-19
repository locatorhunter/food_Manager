# SAT Lunch - Firebase Web Application

## Project Overview

This is a Firebase-powered web application for managing lunch orders and user administration. The project includes user authentication, admin functionality, menu management, and order processing capabilities.

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **UI Framework**: Custom CSS with responsive design
- **Icons**: Font Awesome
- **Date/Time**: Modern JavaScript Date APIs

## Key Components

### Authentication System
- Email/password authentication via Firebase Auth
- User roles (admin, regular user)
- Secure session management
- Password reset functionality

### Admin Features
- User management and deletion
- User migration capabilities
- Dashboard with analytics
- Administrative controls

### Menu Management
- Dynamic menu display
- Order processing
- Menu item management

## File Structure

```
/home/vijays/food_Manager/
├── index.html              # Main landing page (root)
├── auth/                   # Authentication pages
│   ├── login.html          # User login page
│   ├── signup.html         # User registration page
│   └── auth.js             # Authentication logic
├── dashboard/              # User dashboard
│   ├── dashboard.html      # Main user dashboard
│   ├── user-orders.html    # Past orders view
│   ├── dashboard.js        # Dashboard logic
│   └── user-orders.js      # User orders logic
├── admin/                  # Admin functionality
│   ├── admin.html          # Main admin panel
│   ├── migrate-users.html  # User migration tool
│   ├── admin.js            # Admin functionality
│   └── tests/              # Test files and diagnostics
├── menu/                   # Menu management
│   ├── menu.html           # Menu viewing/ordering
│   └── menu.js             # Menu logic
├── auragram/               # Auragram feature
│   ├── auragram.html       # Auragram social feed
│   └── auragram.js         # Auragram logic
├── shared/                 # Shared assets and utilities
│   ├── scripts/            # Shared JavaScript (common.js, utils.js, etc.)
│   └── styles/             # Shared CSS (style.css)
├── .gemini/                # Gemini AI configuration
├── firebase.json           # Firebase configuration
└── firestore.rules         # Firestore security rules
```

## MCP Servers Configuration

The project includes several MCP (Model Context Protocol) servers for enhanced AI capabilities:

### menu_book_spark
- **Purpose**: Menu and order management assistance
- **Command**: `npx -y @modelcontextprotocol/server-menu-book-spark`
- **Use Case**: Help with menu optimization, order analysis, inventory management

### Filesystem
- **Purpose**: File system access within allowed paths
- **Command**: `npx -y @modelcontextprotocol/server-filesystem`
- **Allowed Paths**: `/tmp:/var/tmp:~/sat_lunch`

### Web Search
- **Purpose**: Web research capabilities
- **Command**: `npx -y @modelcontextprotocol/server-web-search`

### Git
- **Purpose**: Git repository management
- **Command**: `npx -y @modelcontextprotocol/server-git`

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Configure Firebase**
   - Update `firebase.json` with your project settings
   - Set up Firebase Authentication, Firestore, and Cloud Functions
   - Configure security rules

3. **Environment Setup**
   - Copy the `.gemini/settings.json` to your home directory: `~/.gemini/settings.json`
   - Install MCP servers globally or locally as needed

## Development Guidelines

### JavaScript Best Practices
- Use ES6+ features (arrow functions, destructuring, modules)
- Implement proper error handling
- Follow Firebase security rules
- Use async/await for Firebase operations

### CSS Guidelines
- Mobile-first responsive design
- Use CSS Grid and Flexbox for layouts
- Maintain consistent color scheme and typography
- Implement accessibility standards

### Security Considerations
- Validate all user inputs
- Implement proper authentication checks
- Use Firebase security rules
- Protect sensitive operations with proper authorization

## Available Scripts

- **Development**: Open `index.html` in browser
- **Firebase Emulators**: `firebase emulators:start`
- **Deploy**: `firebase deploy`
- **MCP Testing**: Use `menu_book_spark` for menu-related assistance

## Common Tasks

### Adding New Features
1. Create corresponding JavaScript module in `js/`
2. Update HTML templates as needed
3. Add appropriate CSS in `css/style.css`
4. Update documentation

### User Management
- Use `js/admin.js` for admin operations
- Test user deletion with `user-deletion-test.html`
- Migrate users with `migrate-users.html`

### Menu Operations
- Manage menu items through Firebase Firestore
- Use `js/menu.js` for menu logic
- Implement proper validation for menu updates

## Troubleshooting

### Authentication Issues
- Check Firebase configuration in `.firebaserc`
- Verify authentication rules in Firebase Console
- Test with `auth.md` guide

### MCP Server Issues
- Ensure Node.js and npm are installed
- Check server installation: `npx -y @modelcontextprotocol/server-menu-book-spark`
- Verify paths in settings.json

### Firebase Issues
- Check network connectivity
- Verify Firestore rules
- Review Firebase Console for errors

## AI Assistance Features

The integrated MCP servers provide:

- **Smart Code Review**: Use AI to review code changes
- **Menu Optimization**: AI-powered menu analysis and suggestions
- **Documentation Generation**: Auto-generate API docs
- **Bug Detection**: Automated error detection and suggestions
- **Performance Analysis**: Code optimization recommendations

## Contributing

1. Follow the established file structure
2. Use meaningful commit messages
3. Test all changes before submitting
4. Update documentation for new features
5. Ensure all MCP servers are properly configured

## Support

For technical issues or questions:
1. Check existing documentation files (*.md files in root)
2. Review Firebase Console logs
3. Test with MCP servers enabled
4. Consult the troubleshooting section above