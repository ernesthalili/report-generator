class CrossReferenceModule {
  constructor(options = {}) {
    this.name = 'CrossReferenceModule';
    this.requiredAPIVersion = "3.17.0";
    
    this.options = {
      figureLabel: options.figureLabel || 'Figure',
      bookmarkPrefix: options.bookmarkPrefix || '_Fig',
      startNumber: options.startNumber || 1,
      ...options
    };
    
    this.bookmarks = new Map();
    this.figureCounter = this.options.startNumber - 1;
  }

  set(options) {
    if (options.Lexer) {
      this.lexer = options.Lexer;
    }
    if (options.zip) {
      this.zip = options.zip;
    }
  }

  optionsTransformer(opts, docxtemplater) {
    this.zip = docxtemplater.zip;
    return opts;
  }

  parse(tag) {
    const fullTag = tag.value || tag;
    
    if (typeof fullTag !== 'string') {
      return null;
    }
    
    if (fullTag.startsWith("&figure ")) {
      const captionKey = fullTag.substring(8).trim();
      return {
        type: "placeholder",
        module: this.name,
        subType: "figure",
        captionKey: captionKey,
        value: fullTag
      };
    }
    
    if (fullTag.startsWith("$ref ")) {
      const figureNumStr = fullTag.substring(5).trim();
      const figureNum = parseInt(figureNumStr, 10);
      
      if (isNaN(figureNum)) {
        throw new Error(`Invalid figure reference: ${fullTag}. Expected a number.`);
      }
      
      return {
        type: "placeholder",
        module: this.name,
        subType: "reference",
        figureNum: figureNum,
        value: fullTag
      };
    }
    
    return null;
  }

  postparse(parsed) {
    const traverse = (parts) => {
      if (!Array.isArray(parts)) return;
      
      for (const part of parts) {
        if (part.module === this.name && part.subType === "figure") {
          this.figureCounter++;
          const figNum = this.figureCounter;
          const bookmarkId = `${this.options.bookmarkPrefix}${figNum}`;
          this.bookmarks.set(figNum, bookmarkId);
          part.figureNum = figNum;
        }
        
        if (part.parts) {
          traverse(part.parts);
        }
        if (part.subparsed) {
          traverse(part.subparsed);
        }
      }
    };
    
    traverse(parsed);
    return parsed;
  }

  render(part, options) {
    if (!part.module || part.module !== this.name) {
      return;
    }

    if (part.subType === "figure") {
      const figNum = part.figureNum;
      const bookmarkId = this.bookmarks.get(figNum);
      
      let captionText = '';
      
      // Access data from scopeManager
      if (options.scopeManager && options.scopeManager.scopeList) {
        const scope = options.scopeManager.scopeList[options.scopeManager.scopeList.length - 1];
        captionText = scope[part.captionKey] || '';
      }
      
      if (!captionText) {
        captionText = `[Missing: ${part.captionKey}]`;
      }
      
      const label = `${this.options.figureLabel} ${figNum}:`;
      const fullText = `${label} ${captionText}`;
      
      // Return with paragraphLoop:true context to break out of text runs properly
      return {
        value: this.generateFigureBookmarkRaw(figNum, bookmarkId, label, captionText)
      };
    }

    if (part.subType === "reference") {
      const figNum = part.figureNum;
      const bookmarkId = this.bookmarks.get(figNum);
      
      if (!bookmarkId) {
        return {
          value: `[ERROR: Figure ${figNum} not defined]`
        };
      }
      
      const displayText = `${this.options.figureLabel} ${figNum}`;
      
      // Return raw XML that will be inserted into the document
      return {
        value: this.generateCrossReferenceRaw(figNum, bookmarkId, displayText)
      };
    }
  }

  postrender(rendered) {
    return rendered;
  }

  // Generate bookmark with proper XML structure
  generateFigureBookmarkRaw(figNum, bookmarkId, label, captionText) {
    const escapedCaption = this.escapeXml(captionText);
    
    // Return the complete XML structure
    return `<w:bookmarkStart w:id="${figNum}" w:name="${bookmarkId}"/>${label} ${escapedCaption}<w:bookmarkEnd w:id="${figNum}"/>`;
  }

  // Generate cross-reference field
  generateCrossReferenceRaw(figNum, bookmarkId, displayText) {
    const escaped = this.escapeXml(displayText);
    
    // Return field codes that Word will recognize
    return `<w:fldChar w:fldCharType="begin"/><w:instrText xml:space="preserve"> REF ${bookmarkId} \\h </w:instrText><w:fldChar w:fldCharType="separate"/>${escaped}<w:fldChar w:fldCharType="end"/>`;
  }

  escapeXml(text) {
    if (typeof text !== 'string') {
      return '';
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  reset() {
    this.bookmarks.clear();
    this.figureCounter = this.options.startNumber - 1;
  }
}

module.exports = CrossReferenceModule;
