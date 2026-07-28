-- Migration 0098: seed the initial curated product templates.
--
-- Four starter templates with print areas sized from Printful's published
-- specs (approximate — TO REFINE against Printful's real product templates in
-- the P3 catalog-ingestion phase). Deterministic ids so the seed is
-- re-runnable. Base images are inline SVG mockups (data URLs).
--
-- Rollback: DELETE FROM product_templates WHERE key IN
--   ('tshirt-unisex','hoodie-allover','mug-11oz','poster-18x24');
--   (print areas cascade via FK).

DELETE FROM template_print_areas WHERE template_id IN
  ('tpl-tshirt-unisex','tpl-hoodie-allover','tpl-mug-11oz','tpl-poster-18x24');
DELETE FROM product_templates WHERE id IN
  ('tpl-tshirt-unisex','tpl-hoodie-allover','tpl-mug-11oz','tpl-poster-18x24');

INSERT INTO product_templates (id, key, name, description, product_type, base_image, default_price, sort_order) VALUES
 ('tpl-tshirt-unisex','tshirt-unisex','Unisex T-Shirt','Classic DTG-printed unisex tee with a front print area.','tee','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNjAwIDYwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNlZWYxZjQiLz48cGF0aCBkPSJNMzAwIDExMCBxLTU1IC02IC03MCAyNCBsLTkwIDQwIC0zMCA4MCA2MCAzNCAyMCAtMzQgdjIyMCBoMjIwIHYtMjIwIGwyMCAzNCA2MCAtMzQgLTMwIC04MCAtOTAgLTQwIHEtMTUgLTMwIC03MCAtMjR6IiBmaWxsPSIjNWI2NDc0Ii8+PHRleHQgeD0iMzAwIiB5PSI1NjAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOWFhNGIyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5VbmlzZXggVC1TaGlydDwvdGV4dD48L3N2Zz4K',24.00,0),
 ('tpl-hoodie-allover','hoodie-allover','All-Over Print Hoodie','Sublimated hoodie printed edge to edge across the whole garment.','hoodie','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNjAwIDYwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNlZWYxZjQiLz48cGF0aCBkPSJNMjEwIDEyMCBxOTAgLTU1IDE4MCAwIGw3MCA0MCA0MCA5MCAtNzAgNDAgLTEwIC00MCB2MjUwIHEtMTQwIDQwIC0yODAgMCB2LTI1MCBsLTEwIDQwIC03MCAtNDAgNDAgLTkweiIgZmlsbD0iIzRiNTU2MyIvPjxwYXRoIGQ9Ik0zMDAgOTIgcS00NiA0IC01MCAzNCBxNTAgNDAgMTAwIDAgcS00IC0zMCAtNTAgLTM0eiIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjMwMCIgeT0iNTYwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzlhYTRiMiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWxsLU92ZXIgSG9vZGllPC90ZXh0Pjwvc3ZnPgo=',59.00,1),
 ('tpl-mug-11oz','mug-11oz','11oz Mug','Ceramic mug with a wrap-around print area.','mug','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNjAwIDYwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNlZWYxZjQiLz48cmVjdCB4PSIxMjAiIHk9IjIwMCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIHJ4PSIyNCIgZmlsbD0iI2RmZTRlYSIgc3Ryb2tlPSIjYjhjMGNjIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNNDIwIDI0MCBxNzAgMCA3MCA2MCB0LTcwIDYwIiBmaWxsPSJub25lIiBzdHJva2U9IiNiOGMwY2MiIHN0cm9rZS13aWR0aD0iMTgiLz48dGV4dCB4PSIzMDAiIHk9IjQ3MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5YWE0YjIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjExb3ogTXVnPC90ZXh0Pjwvc3ZnPgo=',14.00,2),
 ('tpl-poster-18x24','poster-18x24','Poster 18x24','Matte poster with a full-bleed print area.','poster','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNjAwIDYwMCI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNlZWYxZjQiLz48cmVjdCB4PSIxNzAiIHk9IjcwIiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjQ0MCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjYzNjYWQ0IiBzdHJva2Utd2lkdGg9IjYiLz48dGV4dCB4PSIzMDAiIHk9IjU2MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5YWE0YjIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjE4eDI0IFBvc3RlcjwvdGV4dD48L3N2Zz4K',22.00,3);

INSERT INTO template_print_areas (id, template_id, key, name, placement, phys_width, phys_height, unit, required_dpi, x_percent, y_percent, width_percent, height_percent, sort_order) VALUES
 ('tpa-tee-front','tpl-tshirt-unisex','front','Front Print','front',12,16,'in',150,25,24,50,50,0),
 ('tpa-hoodie-all','tpl-hoodie-allover','all_over','All-Over','all_over',40,30,'in',150,5,8,90,84,0),
 ('tpa-mug-wrap','tpl-mug-11oz','wrap','Wrap Print','wrap',9.5,3.5,'in',300,20,33,50,34,0),
 ('tpa-poster-full','tpl-poster-18x24','full','Full Poster','front',18,24,'in',150,29,12,42,73,0);
