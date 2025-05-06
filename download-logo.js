// Script temporaire pour télécharger le logo
import { image } from 'image-downloader';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadLogo() {
  try {
    // URL de l'image temporaire partagée (à remplacer par l'URL réelle de l'image)
    const options = {
      url: 'https://attachmentsgpt.s3.us-west-2.amazonaws.com/8HaqTUj28sAGQjpABpFBBIpgARkwE5yZdvqYjNQV/human_attachment_f8fda47b-a6e2-4347-8d81-f066d825c9d9.png',
      dest: path.join(__dirname, 'public', 'logo-collet.png')
    };

    console.log('Téléchargement du logo...');
    const { filename } = await image(options);
    console.log('Logo téléchargé avec succès:', filename);
  } catch (error) {
    console.error('Erreur lors du téléchargement du logo:', error);
  }
}

downloadLogo(); 