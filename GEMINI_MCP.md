# GEMINI_MCP.md - MCP Server Configuration Guide

## Overview

This guide provides detailed information about the Model Context Protocol (MCP) servers configured for the SAT Lunch project. MCP servers extend the AI assistant's capabilities by providing specialized tools and context for specific tasks.

## Configuration Location

The MCP servers are configured in `.gemini/settings.json`. Copy this file to your home directory as `~/.gemini/settings.json` to enable the MCP functionality.

## Configured MCP Servers

### 1. menu_book_spark

**Purpose**: Menu and order management assistance for restaurant applications

**Configuration**:
```json
"menu_book_spark": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-menu-book-spark"],
  "env": {}
}
```

**Capabilities**:
- Menu item analysis and optimization
- Order pattern recognition
- Inventory management assistance
- Sales analytics and reporting
- Customer preference analysis
- Menu pricing recommendations

**Usage Examples**:
- "Analyze current menu performance and suggest improvements"
- "Help optimize menu items based on order history"
- "Generate sales reports for the past month"
- "Suggest new menu items based on customer preferences"

### 2. Filesystem

**Purpose**: Safe file system access within controlled directories

**Configuration**:
```json
"filesystem": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "env": {
    "ALLOWED_PATHS": "/tmp:/var/tmp:~/sat_lunch"
  }
}
```

**Capabilities**:
- File and directory operations within allowed paths
- Safe file reading and writing
- Directory traversal and management
- File system analytics and insights

**Security**: Only allows operations within specified paths (`/tmp`, `/var/tmp`, `~/sat_lunch`)

**Usage Examples**:
- "Help organize and analyze the project files"
- "Review code files for potential improvements"
- "Generate project structure documentation"
- "Analyze file dependencies and relationships"

### 3. Web Search

**Purpose**: Web research and information gathering

**Configuration**:
```json
"web_search": {
  "command": "npx", 
  "args": ["-y", "@modelcontextprotocol/server-web-search"],
  "env": {}
}
```

**Capabilities**:
- Web search and information retrieval
- Real-time data gathering
- Research assistance for development
- Technology trend analysis

**Usage Examples**:
- "Research latest Firebase security best practices"
- "Find information about restaurant menu optimization"
- "Look up recent updates to web development technologies"
- "Research industry standards for food ordering systems"

### 4. Git

**Purpose**: Git repository management and version control assistance

**Configuration**:
```json
"git": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-git"],
  "env": {}
}
```

**Capabilities**:
- Git repository operations
- Version control best practices
- Code review assistance
- Branch management
- Commit history analysis

**Usage Examples**:
- "Review recent commits and suggest improvements"
- "Help optimize git workflow for this project"
- "Analyze code changes and suggest cleanup"
- "Assist with merge conflict resolution"

## Installation and Setup

### Prerequisites
1. **Node.js**: Version 16 or higher
2. **npm**: Package manager
3. **Firebase CLI**: For Firebase operations

### Installation Steps

1. **Install MCP Servers Globally** (Optional):
   ```bash
   npm install -g @modelcontextprotocol/server-menu-book-spark
   npm install -g @modelcontextprotocol/server-filesystem
   npm install -g @modelcontextprotocol/server-web-search
   npm install -g @modelcontextprotocol/server-git
   ```

2. **Copy Configuration**:
   ```bash
   # Copy settings to home directory
   cp .gemini/settings.json ~/.gemini/settings.json
   ```

3. **Verify Installation**:
   ```bash
   # Test each server
   npx -y @modelcontextprotocol/server-menu-book-spark --version
   npx -y @modelcontextprotocol/server-filesystem --version
   npx -y @modelcontextprotocol/server-web-search --version
   npx -y @modelcontextprotocol/server-git --version
   ```

## Usage Guidelines

### Best Practices

1. **Specific Requests**: Be specific about what you want the MCP server to help with
   - ❌ "Help with the menu"
   - ✅ "Use menu_book_spark to analyze menu performance and suggest 3 underperforming items to improve"

2. **Context Awareness**: Provide relevant context about your project
   - Mention the file structure
   - Reference specific functionalities
   - Include any constraints or requirements

3. **Security Considerations**:
   - Filesystem access is restricted to allowed paths
   - Web search results should be verified
   - Git operations affect the repository state

### Example Interactions

#### Menu Analysis Request
```
"Can you use the menu_book_spark MCP server to analyze our current menu in Firestore, 
identify the top 5 best-performing items, and suggest 3 menu items to improve based on 
sales data and customer preferences?"
```

#### Code Review Request
```
"Use the git MCP server to review the recent commits, identify any potential issues 
in the admin functionality (js/admin.js), and suggest improvements for user deletion 
procedures."
```

#### Documentation Request
```
"Use the filesystem MCP server to generate comprehensive documentation for our 
JavaScript modules, focusing on the authentication system and admin features."
```

#### Research Request
```
"Use the web_search MCP server to research the latest security best practices for 
Firebase Authentication and suggest improvements to our current implementation."
```

## Troubleshooting

### Common Issues

#### Server Not Found
**Error**: "Command not found" or similar
**Solution**: 
```bash
# Install globally or use npx
npm install -g <server-package>
# Or use npx directly
npx -y <server-package>
```

#### Permission Errors
**Error**: Access denied to filesystem
**Solution**: Check allowed paths in configuration
**Verify**: 
```json
"ALLOWED_PATHS": "/tmp:/var/tmp:~/sat_lunch"
```

#### Network Issues
**Error**: Web search timeouts
**Solution**: Check internet connection, try again later
**Alternative**: Use cached search results when possible

### Debug Steps

1. **Check Configuration**:
   ```bash
   cat ~/.gemini/settings.json
   ```

2. **Test Individual Servers**:
   ```bash
   npx -y @modelcontextprotocol/server-menu-book-spark --help
   ```

3. **Verify Paths**:
   ```bash
   # Check if paths exist
   ls /tmp /var/tmp ~/sat_lunch
   ```

4. **Review Logs**:
   - Check browser console for errors
   - Review Firebase Console for server-related logs
   - Check system logs for installation issues

## Advanced Configuration

### Custom Server Addition

To add new MCP servers:

1. **Add to settings.json**:
   ```json
   "custom_server": {
     "command": "npx",
     "args": ["-y", "@your-org/your-mcp-server"],
     "env": {
       "CUSTOM_VAR": "value"
     }
   }
   ```

2. **Test the server**:
   ```bash
   npx -y @your-org/your-mcp-server --version
   ```

3. **Update documentation**: Add details to this guide

### Environment Variables

You can customize server behavior with environment variables:

```json
"env": {
  "MENU_BOOK_DEBUG": "true",
  "FILESYSTEM_MAX_DEPTH": "3",
  "WEB_SEARCH_TIMEOUT": "30000",
  "GIT_MAX_COMMITS": "100"
}
```

## Integration with Development Workflow

### Code Reviews
- Use `git` MCP for commit analysis
- Use `filesystem` MCP for code review
- Use `menu_book_spark` for business logic review

### Documentation
- Use `filesystem` MCP for documentation generation
- Use `web_search` MCP for industry best practices
- Use `git` MCP for changelog generation

### Testing
- Use `filesystem` MCP for test file analysis
- Use `menu_book_spark` for user flow testing
- Use `web_search` MCP for testing best practices

### Deployment
- Use `git` MCP for release preparation
- Use `filesystem` MCP for deployment verification
- Use `web_search` MCP for deployment best practices

## Support and Resources

- **MCP Specification**: https://modelcontextprotocol.io/
- **Server Repositories**: Check respective npm packages
- **Community**: MCP GitHub discussions and issues
- **Documentation**: Each server has its own documentation

Remember to keep the configuration secure and only allow necessary access paths for the filesystem server.