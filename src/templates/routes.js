const { getTemplateManager } = require('./TemplateManager');

/**
 * Mount template API routes onto an Express router.
 */
function setupTemplateRoutes(apiRouter) {
  // List all templates (without full content)
  apiRouter.get('/templates', (req, res) => {
    const manager = getTemplateManager();
    res.json({
      templates: manager.getTemplates(),
      customPath: manager.getCustomTemplatesPath(),
    });
  });

  // Get a single template with full content
  apiRouter.get('/templates/:id', (req, res) => {
    const manager = getTemplateManager();
    // ID is "source:name" so reconstruct from route param
    const id = req.params.id;
    const template = manager.getTemplate(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ template });
  });

  // Re-scan disk for templates
  apiRouter.post('/templates/reload', (req, res) => {
    const manager = getTemplateManager();
    const templates = manager.reloadTemplates();
    res.json({
      success: true,
      templates,
      customPath: manager.getCustomTemplatesPath(),
    });
  });
}

module.exports = { setupTemplateRoutes };
