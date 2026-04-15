/**
 * Leonardo AI image generator for FDAAF site
 * Generates all placeholder images and saves to public/images/
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = '2c8e2f75-2e1b-4737-b5f2-468202b9301f';
const OUT_DIR = path.resolve('./public/images');
const MODEL_ID = 'b24e16ff-06e3-43eb-8d33-4416c2d75876'; // Leonardo Lightning XL

const images = [
  {
    file: 'hero.jpg',
    w: 1360, h: 768,
    prompt: 'Optimistic nonprofit organization banner, diverse group of people including wheelchair users and people with disabilities engaged in community activities, modern inclusive design, warm teal and orange color palette, professional photography, bright daylight, hopeful and empowering mood',
  },
  {
    file: 'post-1.jpg',
    w: 800, h: 512,
    prompt: 'Professional audio recording microphone with sound waves visualization, modern studio setting, AI voice technology concept, clean minimal background, teal accent lighting, technology meets storytelling',
  },
  {
    file: 'post-2.jpg',
    w: 800, h: 512,
    prompt: 'Wheelchair accessibility ramp leading into a welcoming modern building entrance, bright sunlight, inclusive urban architecture, hopeful and accessible design, warm natural lighting',
  },
  {
    file: 'post-3.jpg',
    w: 800, h: 512,
    prompt: 'Open laptop on a clean desk with a welcome message on screen, warm office setting, nonprofit blog launch concept, soft natural light, inviting atmosphere',
  },
  {
    file: 'post-4.jpg',
    w: 800, h: 512,
    prompt: 'Diverse team of nonprofit volunteers collaborating around a table, inclusive workplace, modern office with natural light, people smiling and engaged in meaningful work, warm community atmosphere',
  },
  {
    file: 'post-5.jpg',
    w: 800, h: 512,
    prompt: 'Confident professional in a wheelchair at a desk writing a letter, natural window light, empowerment and leadership theme, warm tones, professional documentary style',
  },
  {
    file: 'mission.jpg',
    w: 896, h: 576,
    prompt: 'Community gathering scene with diverse people including those with physical disabilities, outdoor park setting, inclusive society concept, people laughing and connecting, warm golden hour lighting, optimistic nonprofit photography',
  },
  {
    file: 'team-ralph.jpg',
    w: 512, h: 640,
    prompt: 'Professional illustration portrait of a man in a wheelchair wearing business attire, confident smile, warm neutral background, nonprofit leader, clean vector art style, teal accent',
  },
  {
    file: 'team-zachary.jpg',
    w: 512, h: 640,
    prompt: 'Professional illustration portrait of a young man wearing hearing aids, casual professional attire, friendly smile, warm neutral background, game developer aesthetic, clean vector art style',
  },
  {
    file: 'team-michael.jpg',
    w: 512, h: 640,
    prompt: 'Professional illustration portrait of a man with audio headphones around his neck, creative professional, friendly expression, warm neutral background, audio engineer aesthetic, clean vector art style',
  },
  {
    file: 'team-paul.jpg',
    w: 512, h: 640,
    prompt: 'Professional illustration portrait of a business man with glasses, corporate secretary and treasurer, warm smile, neutral background, nonprofit administrator, clean vector art style',
  },
  {
    file: 'project-access-entree.jpg',
    w: 896, h: 576,
    prompt: 'Colorful mobile game screenshot of a charming small town community building simulation, accessibility ramps and inclusive features visible in the town, bright cheerful art style, teal and orange color palette, indie game UI elements',
  },
  {
    file: 'project-changed.jpg',
    w: 896, h: 576,
    prompt: 'Dramatic video game cinematic screenshot of a military veteran in a wheelchair navigating challenging environments, choice-based narrative game, moody cinematic lighting, emotional story-driven game aesthetic, dark atmospheric style',
  },
  {
    file: 'project-wheelchaired.jpg',
    w: 896, h: 576,
    prompt: 'Documentary photograph of volunteers using wheelchairs for a day experience, navigating a sidewalk and public spaces, authentic empathy building event, candid natural photography, warm inclusive mood',
  },
  {
    file: 'volunteer.jpg',
    w: 896, h: 576,
    prompt: 'Remote volunteer team working together online, diverse people on video calls from home offices, nonprofit collaboration, modern technology connecting volunteers across the country, warm productive atmosphere',
  },
];

async function apiPost(endpoint, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'cloud.leonardo.ai',
      path: `/api/rest/v1${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'cloud.leonardo.ai',
      path: `/api/rest/v1${endpoint}`,
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generate(img) {
  console.log(`\n→ Generating: ${img.file}`);
  const res = await apiPost('/generations', {
    modelId: MODEL_ID,
    prompt: img.prompt,
    width: img.w,
    height: img.h,
    num_images: 1,
    guidance_scale: 7,
    photoReal: false,
    alchemy: true,
  });

  const genId = res.sdGenerationJob?.generationId;
  if (!genId) { console.error('  ✗ No generation ID', res); return; }
  console.log(`  Started: ${genId}`);

  // Poll until complete
  for (let i = 0; i < 30; i++) {
    await sleep(5000);
    const poll = await apiGet(`/generations/${genId}`);
    const status = poll.generations_by_pk?.status;
    const imgs = poll.generations_by_pk?.generated_images;
    console.log(`  Status: ${status}`);
    if (status === 'COMPLETE' && imgs?.length) {
      const url = imgs[0].url;
      const dest = path.join(OUT_DIR, img.file);
      await downloadFile(url, dest);
      console.log(`  ✓ Saved: ${img.file}`);
      return;
    }
    if (status === 'FAILED') { console.error('  ✗ Generation failed'); return; }
  }
  console.error('  ✗ Timed out');
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const pending = images.filter(img => !fs.existsSync(path.join(OUT_DIR, img.file)));
  console.log(`Generating ${pending.length} images (skipping already-saved) into ${OUT_DIR}\n`);
  for (const img of pending) {
    await generate(img);
    await sleep(2000); // brief pause between jobs
  }
  console.log('\n✓ All done!');
}

main().catch(console.error);
