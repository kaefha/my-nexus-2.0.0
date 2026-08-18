# Rules

## Cross-Platform and Windows Compatibility
- **Always ensure compatibility with Windows OS.**
- Use cross-platform libraries/tools (e.g., `cross-env`, `rimraf`) in `package.json` scripts if environment variables or file operations are needed.
- Be mindful of file path separators (avoid hardcoding `/` when resolving paths programmatically, use `path.join`).
- Keep the overall workflow, scripts, and commands Windows-friendly.

## Language Preference
- **Always communicate with the user in Indonesian (Bahasa Indonesia).**

## Repository & Production Environment
- **Repository Remote**: `https://github.com/mitraaksesinsani/mai-nexus-1.0.git`
- **Production URL**: `https://mai-nims.vercel.app/`

## Project Scope & System Integrity (MAI NIMS)
- Aplikasi ini adalah **MAI NIMS (Nexus Inventory Management System)** yang murni berfokus pada operasional gudang (*warehousing*), inventaris (*inventory*), pengadaan (*procurement*), *Request for Consumption* (RFC), logistik pengiriman material, dan master data.
- **DILARANG** mencampurkan modul GIS atau modul lifecycle proyek fiber optik seperti *Planning*, *Survey*, *DRM*, *Implementation*, *Commissioning*, *Closing*, atau *Financial Control* (fitur-fitur tersebut milik platform **MAI-FOP**).
- Jika ada anomali atau elemen yang tidak sesuai dengan lingkup NIMS tercampur di dalam repository ini, **SEGERA ALERT/PERINGATKAN USER!**
