# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please email: **avinashvelu03@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Time

- **Acknowledgement**: within 48 hours
- **Status update**: within 5 business days
- **Fix release**: within 14 days for critical issues

## Security Principles

- Zero runtime dependencies (no supply chain risk from transitive deps)
- No use of `eval` or `Function` constructor
- No prototype pollution (all object access via `Object.prototype.hasOwnProperty`)
- No dynamic code execution
