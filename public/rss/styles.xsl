<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <xsl:variable name="fr" select="/rss/channel/language = 'fr-fr'"/>
    <xsl:variable name="feed">
      <xsl:value-of select="/rss/channel/link"/>
      <xsl:choose>
        <xsl:when test="$fr">fr-fr/rss.xml</xsl:when>
        <xsl:otherwise>rss.xml</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <html>
      <head>
        <title><xsl:value-of select="/rss/channel/title"/></title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width"/>
        <style>
          :root { color-scheme: dark; }
          body {
            margin: 0;
            padding: 2.5rem 1.5rem 4rem;
            background: #18181b radial-gradient(110% 78% at 50% 22%, #1e1e24 0%, #18181b 45%, #101013 100%) no-repeat;
            color: #f4f4f5;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 14px;
            line-height: 1.6;
          }
          main { max-width: 48rem; margin: 0 auto; }
          .panel {
            border: 1px solid #3f3f46;
            border-radius: 4px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 1.5rem;
          }
          h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
          h2 { font-size: 0.875rem; font-weight: 600; margin: 0; }
          p { margin: 0.35rem 0 0; color: #a1a1aa; }
          a { color: inherit; }
          .url {
            display: block;
            margin-top: 0.75rem;
            padding: 0.5rem 0.65rem;
            border: 1px dashed #3f3f46;
            border-radius: 4px;
            color: #4ade80;
            word-break: break-all;
          }
          ul { list-style: none; padding: 0; margin: 0; }
          li { padding: 0.75rem 0; border-bottom: 1px dashed #3f3f46; }
          li:last-child { border-bottom: 0; }
          .date { color: #a1a1aa; font-size: 0.75rem; }
          .back { display: inline-block; margin-top: 1.5rem; color: #a1a1aa; }
        </style>
      </head>
      <body>
        <main>
          <div class="panel">
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p><xsl:value-of select="/rss/channel/description"/></p>
            <p>
              <xsl:choose>
                <xsl:when test="$fr">Ceci est un flux RSS. Collez cette adresse dans votre lecteur de flux pour suivre les nouveaux articles.</xsl:when>
                <xsl:otherwise>This is an RSS feed. Paste this address into a feed reader to follow new posts.</xsl:otherwise>
              </xsl:choose>
            </p>
            <code class="url"><xsl:value-of select="$feed"/></code>
          </div>

          <div class="panel">
            <ul>
              <xsl:for-each select="/rss/channel/item">
                <li>
                  <h2>
                    <a href="{link}"><xsl:value-of select="title"/></a>
                  </h2>
                  <p class="date"><xsl:value-of select="substring(pubDate, 6, 11)"/></p>
                </li>
              </xsl:for-each>
            </ul>
          </div>

          <a class="back" href="{/rss/channel/link}">
            <xsl:choose>
              <xsl:when test="$fr">← retour au site</xsl:when>
              <xsl:otherwise>← back to the site</xsl:otherwise>
            </xsl:choose>
          </a>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
