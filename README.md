# Home Office Data Explorer

A browser-based data explorer for UK Home Office small-boats crossing data (English Channel, 2018–present). Single-page React app, no build step at runtime — everything is served as one HTML file with inlined data and Babel-in-the-browser for JSX.

Data is sourced weekly from the gov.uk publication [_Migrants detected crossing the English Channel in small boats — time series_](https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats) and is auto-refreshed daily via GitHub Actions.

## Quickstart

```bash
# Install Python dependencies
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Regenerate the data module from a cached ODS
python scripts/build_boats_data.py cache/latest.ods data/

# Bundle src/*.jsx + data/boats-data.js into index.html
python scripts/bundle.py

# Serve locally
python -m http.server 8000
```

Open http://localhost:8000.

## Developer docs

See `CLAUDE.md` for the architecture, data globals, editing rules, and scope boundaries. See `design/tokens.md` for the design system.

## Licence

Source data: UK Open Government Licence v3.0.
