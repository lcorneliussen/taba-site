# Launch taba.sh on GitHub Pages

The custom domain is now `taba.sh`. The previous `wtc.sh` domain redirects to it with paths preserved. Keep that redirect in place. The CLI and repository names remain unchanged until their rename releases ship.

## Owner checklist

1. Verify `taba.sh` in the GitHub account’s Settings → Pages. Add the exact TXT record GitHub provides; retain it after verification.
2. In [repository Settings → Pages](https://github.com/lcorneliussen/taba-site/settings/pages), select **GitHub Actions**. Confirm the `github-pages` environment permits `main`.
3. Save **taba.sh** as the custom domain **before pointing DNS at GitHub**, avoiding an unclaimed-domain takeover window. Custom Actions deployments ignore CNAME files; the repository setting is required.
4. Inspect existing DNS records. Preserve mail and verification records; replace only conflicting website records. Set apex `@` A records to all four GitHub Pages addresses:

   ```text
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   Alternatively use a provider-supported apex ALIAS/ANAME to `lcorneliussen.github.io`, not a repository URL. Optional IPv6 AAAA records, alongside IPv4:

   ```text
   2606:50c0:8000::153
   2606:50c0:8001::153
   2606:50c0:8002::153
   2606:50c0:8003::153
   ```

   Recommended: `www` CNAME to `lcorneliussen.github.io`; GitHub redirects to the configured apex. Avoid wildcard DNS and remove stale conflicting web records only after checking their purpose.
5. Merge reviewed changes into `main` to deploy. Manual workflow runs must select `main`.
6. Wait for the DNS check and TLS certificate, then enable **Enforce HTTPS**. DNS can take up to 24 hours; inspect conflicting records or restrictive CAA settings if certificate issuance stalls.
7. Verify live: homepage and direct `/docs/getting-started/`, assets without `/wtc-site/`, HTTP-to-HTTPS and optional www redirects, custom 404 with HTTP 404, desktop/mobile navigation, quick-start tabs, collection switching, clipboard, and `https://taba.sh/` canonical URLs. Confirm old `wtc.sh` page links still redirect to the matching `taba.sh` path.

## Rollback

Revert a bad content change on `main` and redeploy. If abandoning Pages, move/remove web DNS before removing the configured domain; do not leave DNS pointing at an unclaimed site. Returning to the project URL requires changing Astro’s origin and base together and rebuilding.

## References

- [GitHub custom domains and DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Verify a domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Astro GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
