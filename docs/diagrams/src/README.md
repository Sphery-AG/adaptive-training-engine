# Regenerating the diagrams

The ERD sheets are hand-written specs rendered to SVG, then rasterised with
headless Chrome. They mirror `engine/db/schema.sql` but are not generated from
it, so a schema change means editing the spec here too.

    python3 sheet_a.py       # -> erd_a.html   sessions and the kiosk link
    python3 sheets_bcd.py    # -> erd_b/c/d.html

Then rasterise each at 2x (sizes are printed by the scripts):

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
      --window-size=2220,1880 --screenshot=erd_a.png file://$PWD/erd_a.html

`erd.py` holds the renderer. It copies the notation used on the Miro board:
box per table, four fills by role, `name: type, // comment` field lines, and
the relationship phrased on the connector.

`fonts/` are the app's own faces, pulled from the deployed build so the
diagrams match the product. Bebas Neue, Space Grotesk, Geist, Geist Mono.
