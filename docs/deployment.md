# Preview deployment on Google Cloud

Bámi Apply can run on Google Cloud Run, and an owned `.xyz` domain can serve it over HTTPS. The domain ending does not require an application change. This repository now produces a Next.js standalone server and includes a multistage Docker image that runs as a non-root user, listens on `0.0.0.0`, and respects Cloud Run's `PORT` environment variable.

The files prepare a deployment; they do not create a Google Cloud project, buy a domain, or publish a site. The commands below are for an operator after reviewing the intended project, public access, region, and billing.

## Current product limits

This release is suitable for a limited preview. There is no account system or cloud database. Career Profile, jobs, and Applications are stored in the user's browser, not in Cloud Run. Career Profile initially contains an editable demonstration profile. Application documents are not generated or submitted.

Browser storage belongs to an origin: `http://localhost`, a Cloud Run `*.run.app` address, `https://example.xyz`, and `https://www.example.xyz` each have separate data. Changing the domain will not copy a user's records. There is no complete cross-origin backup restoration flow yet. Choose the canonical custom domain before asking preview users to keep real records, and avoid promising device sync or migration. Cloud Run's ephemeral filesystem must never become the database for candidate facts.

## Validate the container locally

Use the existing checkout and lockfile; a separate worktree is unnecessary. Run the complete validation command before a release:

```bash
npm ci
npm run check
docker build --platform linux/amd64 --tag bami-apply:preview .
docker run --rm --publish 8080:8080 --env PORT=8080 bami-apply:preview
```

From a second terminal, request `/`, `/dashboard`, and `/applications`, then exercise save, reload, Profile correction, assessment refresh, and invalid-storage recovery in a fresh browser profile. The container build requires `registry.npmjs.org`, the Node image registry, and `fonts.googleapis.com` / `fonts.gstatic.com`; the current app downloads fonts at build time. No AI key, Google service-account key, or database secret is needed for this release.

`.dockerignore` keeps local state, build artifacts, agent instructions, and common secret files out of the image. `.gcloudignore` applies the same exclusions to Cloud Build source uploads. Review the upload list before deployment, especially if adding credential files under a different name. Never embed secrets in a Docker build argument or a `NEXT_PUBLIC_` variable.

For a development environment with a trusted HTTPS proxy, the Dockerfile accepts an optional BuildKit `build_ca` secret containing its public CA certificate. Supply proxy settings through Docker's predefined proxy build arguments and mount the trusted certificate with `--secret id=build_ca,src=path/to/trusted-ca.pem`. The certificate is available only during dependency installation and compilation; it is not copied into the runtime image. Keep TLS verification enabled. Ordinary Cloud Build deployments do not need this environment-specific option.

## Deploy using the repository Dockerfile

The operator needs an authenticated Google Cloud CLI, an existing project with billing enabled, and permission to use Cloud Build, Artifact Registry, Cloud Run, and the chosen runtime service account. Use a dedicated runtime service account with no data access until the app actually needs a backend. Do not reuse the human deployer's credentials inside the container.

This example uses `us-central1` for a preview. Choose a supported region appropriate for the users and any later database; the same region must be used in the Hosting rewrite below.

```bash
BAMI_PROJECT_ID="your-project-id"
BAMI_REGION="us-central1"
BAMI_RUNTIME_SERVICE_ACCOUNT="bami-preview-runtime@$BAMI_PROJECT_ID.iam.gserviceaccount.com"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$BAMI_PROJECT_ID"

gcloud iam service-accounts create bami-preview-runtime --display-name "Bami preview runtime" --project "$BAMI_PROJECT_ID"

gcloud meta list-files-for-upload
```

Deploy the source from the repository root:

```bash
gcloud run deploy bami-apply \
  --source . \
  --project "$BAMI_PROJECT_ID" \
  --region "$BAMI_REGION" \
  --service-account "$BAMI_RUNTIME_SERVICE_ACCOUNT" \
  --port 8080 \
  --cpu 1 \
  --memory 512Mi \
  --concurrency 20 \
  --min-instances 0 \
  --max-instances 2 \
  --allow-unauthenticated
```

Create the runtime service account only once; if an appropriate account already exists, use its email instead. The deployer needs permission to act as that account. It needs no additional application-data permissions for this browser-local release. Because a Dockerfile is present, Cloud Run source deployment uses Cloud Build to build it and stores the resulting image in Artifact Registry. It may prompt to create the source-deployment artifact repository. Review that prompt; do not accept resources in an unintended project. The example deliberately creates a public preview. Organizational IAM policy can prohibit unauthenticated access; resolve that with the project administrator rather than bypassing it.

For a reviewed, separately built release image, create a Docker-format Artifact Registry repository once and deploy that image instead of rebuilding on each deploy:

```bash
BAMI_REPOSITORY="bami-preview"
BAMI_RELEASE_TAG="reviewed-release-1"
BAMI_IMAGE="$BAMI_REGION-docker.pkg.dev/$BAMI_PROJECT_ID/$BAMI_REPOSITORY/bami-apply:$BAMI_RELEASE_TAG"

gcloud artifacts repositories create "$BAMI_REPOSITORY" \
  --repository-format docker \
  --location "$BAMI_REGION" \
  --project "$BAMI_PROJECT_ID"

gcloud builds submit --tag "$BAMI_IMAGE" --project "$BAMI_PROJECT_ID" .

gcloud run deploy bami-apply \
  --image "$BAMI_IMAGE" \
  --project "$BAMI_PROJECT_ID" \
  --region "$BAMI_REGION" \
  --service-account "$BAMI_RUNTIME_SERVICE_ACCOUNT" \
  --port 8080 \
  --cpu 1 \
  --memory 512Mi \
  --concurrency 20 \
  --min-instances 0 \
  --max-instances 2 \
  --allow-unauthenticated
```

Use only one of the deployment paths. Source builds, image storage, network traffic, Hosting, and domain registration can incur charges even when Cloud Run scales to zero. Set a billing budget and alert; alerts and instance limits are not a hard spending cap. These starting CPU, memory, and concurrency values require observation under real preview traffic.

## Connect an owned `.xyz` domain

For a small preview, Firebase Hosting in front of Cloud Run provides managed HTTPS and a custom-domain setup flow. Add Firebase to the same Google Cloud project, enable Hosting, and authenticate the Firebase CLI. Use an empty `hosting-public` directory so Hosting forwards Next.js routes and assets to the standalone server rather than serving an unrelated generated index page.

The following is the intended `firebase.json` configuration for `us-central1`; check the currently supported Hosting-to-Cloud-Run regions before choosing a different location:

```json
{
  "hosting": {
    "public": "hosting-public",
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "bami-apply",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

After creating that configuration and empty directory, run `firebase deploy --only hosting --project "$BAMI_PROJECT_ID"`. In Firebase Hosting, select **Add custom domain**, enter the domain you own, and follow the exact DNS ownership and routing records displayed by the console. Firebase provisions the HTTPS certificate. Choose one canonical hostname; redirect the alternate `www` or apex hostname before users begin creating browser-local data.

For a larger deployment, an external Application Load Balancer with a serverless network endpoint group and Google-managed certificate is another supported custom-domain route. It adds infrastructure and ongoing cost. Direct Cloud Run domain mapping has preview status and region restrictions in Google's documented guidance; review its current limitations before choosing it for a production service.

After HTTPS is active, check the actual public site on desktop and mobile, verify that assets load, save a reviewed job, reload the page, and confirm that a different browser starts with separate data. Do not treat a successful image build or a `run.app` response as proof that custom-domain DNS and TLS are working.

## Before a wider launch

Finish reviewed backup restoration, account authentication, durable Profile/Application storage with per-user access control, and a clear first-run Profile flow before advertising this as an account-based service. Keep the existing verified-evidence and deterministic-score boundaries when introducing any backend or AI service. Deploying the current container alone does not add those capabilities.

## References and verification scope

The installed Next.js 16 documentation was checked for standalone output, static/public asset copying, and `PORT` / `HOSTNAME` behavior. The following official Google/Firebase references are supplied for the deploying operator; live requests to these sites were blocked by this development environment's network proxy, so cloud-side commands, supported regions, and current domain-mapping status have not been verified against a live project:

Local validation passed for the generated standalone Node server on a custom port: the landing page, Dashboard, Applications, Career Profile, and sample analysis rendered successfully; CSS, JavaScript, and public assets were served. Full Docker-image validation remains incomplete: image pulls worked, but a bounded BuildKit registry probe failed with `EAI_AGAIN` while resolving the environment's HTTPS proxy host, despite supplied proxy settings and the trusted CA. This is a local build-network blocker; no Cloud Build or Cloud Run deployment was attempted. Revalidate the full image in an environment with functioning build DNS before publishing.

- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Cloud Run container contract](https://cloud.google.com/run/docs/container-contract)
- [Deploying source code to Cloud Run](https://cloud.google.com/run/docs/deploying-source-code)
- [Cloud Run custom domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Firebase Hosting and Cloud Run](https://firebase.google.com/docs/hosting/cloud-run)
- [Firebase Hosting custom domains](https://firebase.google.com/docs/hosting/custom-domain)
