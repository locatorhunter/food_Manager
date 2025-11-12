# 🍽️ Lunch Manager

A modern, production-ready web application for managing daily employee lunch orders from multiple hotels/restaurants. Built with clean architecture and user-friendly interface.

## ✨ Features

### 🏢 **Admin Panel** (Password Protected)
- Add and manage hotels with veg/non-veg indicators
- Create detailed menu items with categories and pricing
- Select hotels for daily lunch service
- Edit hotel details and manage availability
- Import menu items via CSV upload
- Complete data management with reset options

### 👥 **Employee Ordering**
- Browse available hotels and menus
- Search menu items by name or category
- Expandable hotel sections for organized viewing
- Real-time order summary and cart functionality
- Order confirmation with detailed breakdown
- View personal order history

### 📊 **Dashboard** (Password Protected)
- Comprehensive order analytics and statistics
- Advanced filtering by date, hotel, and employee
- Multiple grouping options (hotel, employee, date, item)
- Export orders to CSV for reporting
- Popular items and hotel performance metrics
- Real-time order tracking and status updates

### 🎨 **User Experience**
- **Navigation**: Home → Menu → Dashboard → Admin
- **Dark/Light Mode**: Automatic theme switching
- **Responsive Design**: Optimized for desktop and mobile
- **Real-time Updates**: Changes reflect immediately
- **Intuitive Interface**: Clean, modern design with smooth animations

## 🚀 Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Firebase account (for multi-device synchronization)

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Realtime Database
3. Get your Firebase configuration
4. Update the config in `index.html`:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### Installation
1. Clone or download the project files
2. Set up Firebase configuration
3. Open `index.html` in your web browser
4. Start using the application immediately

### Quick Setup
The application starts with a clean slate - no demo data included for production use.

## 🔄 Multi-Device Synchronization

**Real-time data sharing across multiple systems:**

- **Admin Setup**: Configure hotels and menus from any device
- **Employee Access**: Place orders from any location/device
- **Live Updates**: Changes appear instantly across all connected devices
- **Central Database**: All data synchronized via Firebase Realtime Database
- **Offline Resilience**: Local caching with automatic sync when online

**Perfect for:**
- Office lunch management across multiple locations
- Team members using different devices
- Real-time order tracking and updates
- Centralized menu management

##  Usage Guide

### For Employees
1. **Home**: View available hotels and get started
2. **Menu**: Browse menus, search items, place orders
3. **Dashboard**: View order confirmations and history

### For Admins
1. **Access**: Enter password "1" for Admin/Dashboard
2. **Setup**: Add hotels and create menus
3. **Daily Management**: Select hotels for lunch service
4. **Monitoring**: Track orders and analytics
5. **Maintenance**: Update menus and manage data

## 🔐 Security & Access

- **Public Access**: Home and Menu pages (no password required)
- **Protected Access**: Admin and Dashboard pages
- **Password**: "1" (case-sensitive)
- **Input Validation**: XSS prevention and data sanitization
- **Local Storage**: All data stored securely in browser

## 📁 Project Structure

```
/
├── index.html          # Landing page with hotel overview
├── admin.html          # Admin management interface (protected)
├── menu.html           # Employee ordering interface
├── dashboard.html      # Analytics dashboard (protected)
├── css/
│   └── style.css       # Main stylesheet with themes
├── js/
│   ├── common.js       # Shared functionality & navigation
│   ├── storage.js      # Data persistence & management
│   ├── admin.js        # Admin panel logic
│   ├── menu.js         # Menu & ordering logic
│   ├── dashboard.js    # Dashboard & analytics
│   └── utils.js        # Utility functions & validation
└── assets/
    └── favicon.png     # App favicon
```

## 🛠️ Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: Browser localStorage with error handling
- **Styling**: Custom CSS with CSS Variables for theming
- **Responsive**: Mobile-first design with breakpoints
- **Performance**: Optimized with debounced search and efficient DOM updates
- **Browser Support**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for mobile devices:

- **Touch-friendly interface** with proper touch targets (minimum 44px)
- **Responsive grid layouts** that adapt to screen size
- **Mobile navigation** with swipe gestures and hamburger menu
- **Optimized forms** with larger inputs and better spacing
- **Horizontal scrolling tables** for dashboard data
- **Floating order summary** for easy access on mobile
- **Prevented zoom on double-tap** for better UX
- **Smooth scrolling** and touch interactions

### Mobile Features:
- Swipe to open/close navigation menu
- Touch feedback animations
- Optimized card layouts
- Better typography scaling
- Accessibility improvements (reduced motion, high contrast support)

## 🔄 Data Management

- **Clean Start**: No demo data - production ready
- **Auto-Cleanup**: Removes any lingering demo data on load
- **Daily Selection**: Hotel choices reset each day
- **Export Options**: CSV export for order data
- **Reset Functions**: Complete data reset capabilities

## 🚀 Deployment

### GitHub Pages
1. Push all files to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Access your live application

### Cache Busting
- Version parameters added to all assets
- Forces fresh downloads on updates
- Increment version numbers for new deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed for real-world office lunch management
- Optimized for performance and user experience
- Production-ready with security considerations

---

**Developed with ❤️ for efficient office lunch management**