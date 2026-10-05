/**
 * Static DOM and CSS Inspector for Opaque-Box E2E Testing
 */
const fs = require('fs');
const path = require('path');

class DomInspector {
  static loadFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  static hasElementById(html, id) {
    const regex = new RegExp(`id=["']${id}["']`, 'i');
    return regex.test(html);
  }

  static hasElementByClass(html, className) {
    const regex = new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["']`, 'i');
    return regex.test(html);
  }

  static extractAttribute(html, selectorPattern, attrName) {
    // E.g. find tag matching selectorPattern, then extract attr
    const tagMatch = html.match(new RegExp(`<[^>]*${selectorPattern}[^>]*>`, 'i'));
    if (!tagMatch) return null;
    const attrMatch = tagMatch[0].match(new RegExp(`${attrName}=["']([^"']*)["']`, 'i'));
    return attrMatch ? attrMatch[1] : null;
  }

  static findAllLinks(html) {
    const links = [];
    const regex = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    while ((match = regex.exec(html)) !== null) {
      links.push({
        href: match[1],
        text: match[2].replace(/<[^>]+>/g, '').trim(),
        raw: match[0]
      });
    }
    return links;
  }

  static validateTagPairing(html) {
    // Detect stray closing tags like </section> without corresponding <section>
    const strayTags = [];
    const sectionOpens = (html.match(/<section\b[^>]*>/gi) || []).length;
    const sectionCloses = (html.match(/<\/section>/gi) || []).length;
    if (sectionCloses > sectionOpens) {
      strayTags.push({ tag: 'section', opens: sectionOpens, closes: sectionCloses });
    }

    const mainOpens = (html.match(/<main\b[^>]*>/gi) || []).length;
    const mainCloses = (html.match(/<\/main>/gi) || []).length;
    if (mainCloses > mainOpens) {
      strayTags.push({ tag: 'main', opens: mainOpens, closes: mainCloses });
    }

    return {
      valid: strayTags.length === 0,
      strayTags
    };
  }

  static hasCssRule(css, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[}\\s,])${escapedSelector}\\s*\\{([^}]+)\\}`, 'm');
    const match = css.match(regex);
    return {
      found: Boolean(match),
      declarations: match ? match[1].trim() : null
    };
  }

  static hasMediaQuery(css, mediaFeature) {
    const escapedFeature = mediaFeature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`@media[^{]*${escapedFeature}[^{]*\\{([\\s\\S]*?\\n\\})`, 'i');
    return regex.test(css);
  }
}

module.exports = { DomInspector };
