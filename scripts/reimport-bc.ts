import { importExistingSite } from '../lib/import/import-existing-site';
import { FsSiteStore } from '../lib/store/fs-site-store';

async function main() {
  const result = await importExistingSite({
    rootPath: 'C:/Users/bjcor/Desktop/website/website',
    projectId: 'bencornelius',
    projectName: 'bencornelius.com',
    publicUrl: 'https://www.bencornelius.com',
    previewBaseUrl: 'http://localhost:3001',
    overwrite: true
  });
  const store = new FsSiteStore(result.project.rootPath);
  const about = await store.getPage('about');
  const manifest = await store.getManifest();
  console.log(
    JSON.stringify(
      {
        pagesWritten: result.pagesWritten,
        files: result.scan.files.length,
        media: result.scan.mediaCount,
        aboutBlocks: about?.blocks.length,
        aboutPath: about?.source?.path,
        manifestFiles: manifest?.files.length
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
