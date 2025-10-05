# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with bun package manager
- Project constitution (v1.0.0) establishing core principles
- Security documentation and trust model
- Core directory structure (src/, test/, examples/)
- **Design**: Filesystem plugin for schema inheritance with `.extends` (see `.specify/memory/filesystem-plugin-design.md`)

### Security

- Documented trust model for expression evaluation
- Added security warnings to README.md
- Established resolver safety guidelines

### Planned

- Filesystem plugin (`@orbzone/dotted-json/plugins/filesystem`) for file-based schema composition
- Built-in `extends()` resolver for loading and merging JSON files
- Special `.extends` dot-prefix with automatic inheritance detection
- Circular dependency detection for `.extends` chains

## [0.1.0] - Not yet released

Initial development version. Features will be documented as they are implemented
following the Test-First Development principle from the constitution.

---

**Note**: Version 0.1.0 represents the initial development phase. The library will
reach v1.0.0 when:

- Core functionality (dotted-json.ts, expression-evaluator.ts) is complete
- Test coverage reaches 100% pass rate
- Security requirements are fully implemented
- Cycle detection and safeguards are in place
- Documentation is complete with examples
