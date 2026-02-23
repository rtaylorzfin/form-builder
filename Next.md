
Next steps (COMPLETED)
===

1. Document the architecture of this code base and why those decisions were made in ARCHITECTURE.md.

2. Add a checkbox for groups to ask if that specific group should take up the full page when a user is filling it out. This could be useful for groups that have a large number of fields to make it less intimidating. For the form filler, when they encounter this group, they should see a button that says "Fill information" (open to suggestions) and then it opens in a new page. When that group is complete, it returns them to their spot in the form. For groups that allow multiple entries, handle that case too.

3. Fix existing bug. See form: 37bab16f-1cf9-439a-b9b7-015fa7034b97. When I try to delete the last text field and save it, it appears to save, however, when I refresh the page, it returns. Other elements also have similar behavior when I try to delete.
