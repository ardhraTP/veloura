const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views', 'user');
const filesToUpdate = [
    'otp-verify.ejs',
    'forgot-password.ejs',
    'forgot-otp-verify.ejs',
    'reset-password.ejs',
    'manage-addresses.ejs',
    'add-address.ejs',
    'edit-address.ejs',
    'profile.ejs',
    'edit-profile.ejs'
];

const oldFontLink = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">';
const newFontLink = '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">';

const rootVars = `        :root {
            --primary-red: #5c1e28;
            --bg-beige: #efece5;
            --text-dark: #2c2c2c;
            --text-light: #666666;
            --white: #ffffff;
        }

`;

filesToUpdate.forEach(file => {
    const filePath = path.join(viewsDir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace Font Link
        content = content.replace(oldFontLink, newFontLink);

        // Add root variables just after <style>
        if (!content.includes('--primary-red')) {
            content = content.replace('<style>', '<style>\n' + rootVars);
        }

        // Replace Font Families
        content = content.replace(/font-family:\s*'Montserrat',\s*sans-serif;/g, "font-family: 'Inter', sans-serif;");
        content = content.replace(/font-family:\s*'Cormorant Garamond',\s*serif;/g, "font-family: 'Playfair Display', serif;");

        // Replace Colors
        content = content.replace(/#6b2c3e/gi, 'var(--primary-red)');
        content = content.replace(/#f5f3f0/gi, 'var(--bg-beige)');
        content = content.replace(/#2c2c2c/gi, 'var(--text-dark)');
        content = content.replace(/#666666|#666\b/gi, 'var(--text-light)');
        content = content.replace(/#ffffff/gi, 'var(--white)');
        content = content.replace(/background:\s*white;/gi, 'background: var(--white);');
        content = content.replace(/background-color:\s*white;/gi, 'background-color: var(--white);');
        content = content.replace(/color:\s*white;/gi, 'color: var(--white);');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
