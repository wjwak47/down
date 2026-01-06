import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.join(__dirname, '../resources/bin');
const ytDlpPath = path.join(binDir, 'yt-dlp.exe');


const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

const downloadFile = (url, dest) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            downloadFile(response.headers.location, dest);
            return;
        }
        if (response.statusCode !== 200) {
            console.error(`Failed to download: ${response.statusCode}`);
            return;
        }
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('Download completed.');
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => { });
        console.error(`Error downloading: ${err.message}`);
    });
};

// Always re-download to get the latest version
console.log('Downloading latest yt-dlp.exe...');
if (fs.existsSync(ytDlpPath)) {
    fs.unlinkSync(ytDlpPath);
}
downloadFile(YT_DLP_URL, ytDlpPath);
