import { pageMetadata, toolMetadata } from '@/lib/seo';
import { evaluateToolIndexability, type ToolDefinition } from '@/lib/tool-registry';
import { requestLocale } from './request-locale';
import { localizedTool } from './tool-copy';
import { localizedHref } from './routing';

export async function localizedToolMetadata(tool: ToolDefinition) {
  const locale = await requestLocale();
  if (locale === 'en-US') return toolMetadata(tool);
  const translated = localizedTool(tool, locale);
  return pageMetadata(translated.title, translated.description, localizedHref(tool.path, locale) as `/${string}`, { index: evaluateToolIndexability(tool).indexable, follow: true });
}
