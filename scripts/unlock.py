import re

# Read app.js
with open('static/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace the modal popup logic
app_js = re.sub(r'if \(premiumUpgradeModal\)\s*premiumUpgradeModal\.classList\.remove\(\'hidden\'\);', '/* unlocked */', app_js)

# Save app.js
with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# Read index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Remove the btnUpgradeTrigger class from all elements to avoid JS attaching events
index_html = index_html.replace('btnUpgradeTrigger', 'btnUnlocked')

# Find the specific top upgrade button and hide it
index_html = index_html.replace('id="btnRaporTopUpgrade"', 'id="btnRaporTopUpgrade" style="display:none;"')

# Save index.html
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print("Unlocked successfully!")
