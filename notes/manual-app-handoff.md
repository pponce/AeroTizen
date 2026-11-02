# Manual app checkpoint

Objective: package AeroTizen as a selectable TV app alongside an existing Vetro installation.

Repository: `pponce/AeroTizen`. Branch: `feat/manual-app-mode`. Base: `79ba9198d63002fbfa5ad620a6abfedebd33cdc5`.

Completed: removed service/prelaunch registration; disabled background support; enabled the manual runtime path; preserved native app launches without watcher handshakes; kept diagnostics local; added tests, a package check, and a build workflow. Public build instructions are in README.md.

Validation: 21 dependency-free Node test files pass locally. Full npm installation and Chromium downloads are blocked in the editing environment, so compilation, lint, and browser checks require GitHub Actions or a development computer. No physical TV installation has been performed.

Decision: retain the normal app identity and existing Vetro. The unrelated CLI can still operate on TV settings when explicitly invoked; those commands are outside the manual-app setup.

Next steps: run the Manual app workflow, review its checks and unsigned widget, sign with the existing Samsung certificate, install, and verify manual open/leave, YouTube, Samsung Home, Live TV, and a cold boot on hardware. Vetro's existing `/install` API offers a TV-local SDB path but needs end-to-end validation. The original PC installer still uses a direct developer connection.
