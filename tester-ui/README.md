# ClassY Test Studio

Bu klasor, ClassY backendlerini test etmek icin hazirlanmis koyu temali bir UI icerir.

## Ne test eder?

- Web API
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/me
- AI Engine
  - GET /
  - POST /generate-quiz
  - POST /generate-study-notes
- Endpoint Explorer ile manuel tum URL denemeleri

## Calistirma

1. Once backendleri ac:

Web:

```
cd C:\classY\ClassY-Project\web
npm run dev
```

AI:

```
cd C:\classY\ClassY-Project\ai-engine
C:\classY\ClassY-Project\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. Tester UI:

```
cd C:\classY\ClassY-Project\tester-ui
npm install
npm run dev
```

3. Tarayicida ac:

http://localhost:4600

## Not

UI, CORS sorunu yasamamak icin
- /proxy/web -> http://localhost:3000
- /proxy/ai  -> http://localhost:8000
proxy gecitlerini kullanir.
