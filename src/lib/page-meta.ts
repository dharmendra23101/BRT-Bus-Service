/**
 * The page's meta description.
 *
 * Lives apart from `RouteChangeHandler` because two things set it: that
 * component, for the routes it knows by pathname, and the place detail page,
 * whose description is the place's own. Resolving a place name inside the
 * eagerly-loaded route handler would have pulled the whole place dataset into
 * the entry chunk for every visitor, including those who never open it.
 */
export const setPageDescription = (content: string | undefined): void => {
  const existing = document.head.querySelector('meta[name="description"]');

  if (!content) {
    existing?.remove();
    return;
  }

  if (existing) {
    existing.setAttribute("content", content);
    return;
  }

  const tag = document.createElement("meta");
  tag.setAttribute("name", "description");
  tag.setAttribute("content", content);
  document.head.appendChild(tag);
};
