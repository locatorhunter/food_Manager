# Lunch Manager

A modern web application for managing daily employee lunch orders from multiple hotels/restaurants.

## Features

- **Admin Panel**: Add hotels, manage menus, select daily hotels
- **Employee Ordering**: Browse menus and place orders from selected hotels
- **Dashboard**: View all orders, statistics, and analytics
- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Changes reflect immediately across the app

## Getting Started

### Prerequisites

- Modern web browser with JavaScript enabled
- No server required - runs entirely in the browser

### Installation

1. Clone or download the project files
2. Open `index.html` in your web browser
3. The app will initialize with demo data

### Usage

#### For Admins

1. Navigate to the Admin panel
2. Add hotels and their menu items
3. Select hotels for today's lunch service
4. Monitor orders via the Dashboard

#### For Employees

1. Go to the Menu page
2. Enter your name
3. Select items from available hotels
4. Place your order
5. View your orders in the "Your Orders Today" section

#### Dashboard

- View all orders with filtering and sorting options
- See statistics like total orders, revenue, popular items
- Export orders to CSV
- Group orders by hotel, employee, or date

## Project Structure

```
/
├── index.html          # Landing page
├── admin.html          # Admin management interface
├── menu.html           # Employee ordering interface
├── dashboard.html      # Orders dashboard and analytics
├── css/
│   └── style.css       # Main stylesheet
├── js/
│   ├── common.js       # Shared functionality
│   ├── storage.js      # Data persistence layer
│   ├── admin.js        # Admin page logic
│   ├── menu.js         # Menu/ordering logic
│   ├── dashboard.js    # Dashboard logic
│   └── utils.js        # Utility functions
└── assets/
    └── favicon.png     # App favicon
```

## Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: Browser localStorage
- **Styling**: Custom CSS with CSS Variables for theming
- **Responsive**: Mobile-first design with media queries

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Security Notes

- Data is stored locally in the browser
- No server-side authentication
- Input validation implemented for security
- XSS prevention through input sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Demo Data

The app includes demo hotels and menu items for testing purposes. You can clear all data using the "Reset Everything" option in the Admin panel.