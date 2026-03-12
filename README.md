 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
index 8d5010528a0acd8bf99e6ec2507270a67e4492ef..0da1a305b4e8faea7aa7a33cd02db5f27237a6c7 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,23 @@
 # lasersetting
-CO2 laser and Fiber setting helper program
+
+CO2 laser and Fiber setting helper program.
+
+## What this app does
+
+This lightweight web app helps users choose starter settings for:
+
+- OMTech CO2 80W (2" lens)
+- OMTech CO2 60W (2" lens)
+- JPT MOPA Fiber 60W (110mm, 200mm, 300mm lenses)
+
+Users can:
+
+1. Select laser, material, engraving/cutting, and thickness.
+2. Get an AI-style recommendation for speed, power, frequency, and passes.
+3. Save real-world successful settings, so future recommendations improve for similar jobs.
+
+## Run locally
+
+Open `index.html` in a browser.
+
+No build step or dependencies required.
 
EOF
)
