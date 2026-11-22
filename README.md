# ConceptLab
Photo of an ICSE textbook page -> AI finds the concept -> interactive simulation.

## Run locally
1. Install Node 18+ and `npm i -g vercel`
2. `cp .env.example .env` and put your key from console.anthropic.com
3. `vercel dev`  (opens http://localhost:3000)

## Deploy (free link to share)
1. Push to GitHub (commands below)
2. Go to vercel.com > Add New Project > import the repo
3. Settings > Environment Variables > add `ANTHROPIC_API_KEY`
4. Deploy. Share the link.

## Push to GitHub
    git init && git add . && git commit -m "ConceptLab v0.2"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/conceptlab.git
    git push -u origin main
(Create the empty repo "conceptlab" on github.com first.)
