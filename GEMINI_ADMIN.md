# GEMINI_ADMIN.md - Admin Functionality Guide

## Overview

This guide provides specific instructions and context for admin-related features in the SAT Lunch application. The admin functionality is handled through the `admin.html` interface and associated JavaScript modules.

## Core Admin Files

### Key Files
- **admin.html**: Main admin dashboard interface
- **js/admin.js**: Core admin functionality and logic
- **js/common.js**: Shared admin utilities
- **migrate-users.html**: User migration interface
- **user-deletion-test.html**: User deletion testing interface

### Admin Operations

#### User Management
```javascript
// User deletion functionality (js/admin.js)
async function deleteUser(userId) {
  // Implementation details in js/admin.js
  // Uses Firebase Auth for secure user deletion
  // Includes error handling and logging
}
```

#### User Migration
```javascript
// User migration logic (migrate-users.html)
// Handles bulk user operations
// Includes progress tracking and error recovery
```

## Admin Dashboard Features

### 1. User Analytics
- Total users count
- Active users tracking
- Registration trends
- User role distribution

### 2. User Operations
- View all users
- Delete individual users
- Bulk user operations
- User role management

### 3. System Monitoring
- Firebase connection status
- Authentication metrics
- Database operations tracking
- Error logging and monitoring

## Security Guidelines

### Admin Access Control
- Verify admin authentication before operations
- Implement role-based access control
- Log all admin actions for audit trail
- Use Firebase security rules for additional protection

### User Deletion Protocol
1. **Pre-deletion Checks**
   - Verify user exists in Firebase Auth
   - Check for active orders/dependencies
   - Confirm admin authorization
   - Backup user data if required

2. **Deletion Process**
   - Remove from Firebase Auth
   - Clean up Firestore user data
   - Remove associated orders/menu items
   - Update analytics metrics

3. **Post-deletion Validation**
   - Confirm user removal
   - Check for orphaned data
   - Update admin dashboard
   - Log operation for audit

## Testing Procedures

### User Deletion Testing
- Use `user-deletion-test.html` interface
- Test with non-critical test accounts
- Verify data cleanup completeness
- Check error handling scenarios

### Migration Testing
- Use `migrate-users.html` for bulk operations
- Test with small user sets first
- Monitor Firebase usage and quotas
- Validate data integrity post-migration

## MCP Server Integration

### menu_book_spark for Admin Tasks
The `menu_book_spark` MCP server can assist with:

- **User Data Analysis**: Analyze user patterns, order history, preferences
- **Admin Reports**: Generate comprehensive admin reports and analytics
- **Security Audits**: Help identify potential security issues or anomalies
- **Performance Optimization**: Suggest improvements for admin operations

### Usage Example
```bash
# When asking AI for help with admin tasks
"Can you use the menu_book_spark MCP server to analyze user deletion patterns and suggest improvements to our admin security protocols?"
```

## Common Admin Tasks

### Daily Operations
1. Monitor user registration trends
2. Review system logs for errors
3. Check Firebase quota usage
4. Validate backup procedures

### Weekly Tasks
1. Review security logs
2. Analyze user behavior patterns
3. Update admin permissions if needed
4. Clean up test data

### Monthly Maintenance
1. Archive old user data
2. Review and optimize Firestore queries
3. Update admin documentation
4. Security audit and compliance check

## Troubleshooting Admin Issues

### Common Problems

#### User Deletion Failures
- **Symptom**: User not removed from Firebase Auth
- **Solution**: Check Firebase permissions, verify user ID, review error logs

#### Migration Timeouts
- **Symptom**: Bulk operations timeout
- **Solution**: Implement batch processing, monitor Firebase quotas

#### Dashboard Loading Issues
- **Symptom**: Admin dashboard doesn't load
- **Solution**: Check authentication, verify Firebase connection, review console errors

### Debug Steps
1. Check Firebase Console for error messages
2. Review browser console for JavaScript errors
3. Verify network connectivity
4. Test with admin credentials
5. Check MCP server status

## Best Practices

### Code Quality
- Always include error handling in admin operations
- Use async/await for Firebase operations
- Implement proper logging for audit trails
- Follow security best practices

### Performance
- Implement pagination for large user lists
- Use Firebase batch operations for bulk updates
- Cache frequently accessed data
- Optimize Firestore queries

### Security
- Validate all admin inputs
- Implement proper authentication checks
- Use Firebase security rules
- Log all admin actions

## Getting AI Help

When working on admin features, you can ask the AI assistant to:
1. Review admin code for security issues
2. Help optimize Firebase queries
3. Suggest improvements to user management
4. Analyze admin operation patterns
5. Help with testing procedures

Remember to reference this guide and the MCP servers configuration when seeking assistance.