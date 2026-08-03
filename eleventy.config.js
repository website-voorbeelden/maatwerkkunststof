module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/_headers': '_headers' });
  eleventyConfig.addPassthroughCopy({ 'src/robots.txt': 'robots.txt' });

  eleventyConfig.addShortcode('year', () => new Date().getFullYear());
  eleventyConfig.addFilter('sitemapDate', (date) => {
    const value = date instanceof Date ? date : new Date(date);
    return value.toISOString().split('T')[0];
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data'
    },
    templateFormats: ['njk', 'md', 'html'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
