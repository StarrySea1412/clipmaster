# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within ClipMaster, please report it responsibly.

### How to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them through one of the following methods:

1. **GitHub Private Vulnerability Reporting** (Recommended)
   - Navigate to the [Security tab](https://github.com/clipmaster/clipmaster/security/advisories/new) of the repository
   - Click "Report a vulnerability"
   - Fill out the vulnerability report form

2. **Email** (if GitHub private reporting is not available)
   - Send an email to the maintainers with subject line: `[SECURITY] ClipMaster Vulnerability Report`
   - Include the following information:
     - Description of the vulnerability
     - Steps to reproduce the issue
     - Potential impact of the vulnerability
     - Any suggested fixes (if applicable)

### What to Expect

After you have submitted your report, you can expect:

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.

2. **Initial Assessment**: We will perform an initial assessment to verify the vulnerability and its severity within 7 days.

3. **Status Updates**: We will keep you informed about our progress and any challenges we encounter.

4. **Resolution**: Once the vulnerability is confirmed and fixed, we will:
   - Credit your contribution (unless you prefer to remain anonymous)
   - Release a patched version
   - Publish a security advisory

### Security Update Process

- We follow semantic versioning for our releases
- Security patches will be released as patch versions (e.g., 0.1.1)
- Major security issues may require a minor version bump

## Security Best Practices

When using ClipMaster, please follow these security best practices:

1. **Enable device encryption** on your computer
2. **Use strong passwords** for your user account
3. **Be cautious with sensitive data** - ClipMaster stores clipboard history locally
4. **Keep the application updated** to receive security patches
5. **Review app permissions** and only grant necessary access

## Security Features

ClipMaster includes the following security features:

- **Local storage**: All data is stored locally on your device
- **No cloud sync by default**: Data does not leave your device unless you explicitly export it
- **Secure clipboard operations**: Uses OS-native clipboard APIs
- **Content hashing**: Uses MD5 for deduplication (not for cryptographic purposes)

## Known Limitations

- ClipMaster is not a password manager - do not store sensitive credentials in clipboard history
- The application does not currently support end-to-end encryption
- History is stored in plain text in a local SQLite database

We take security seriously and appreciate your help in keeping ClipMaster safe for everyone.
