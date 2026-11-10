-- Price-list products (cost +20% margin, MRP about +50%), 2 pictures each, private cost per product.
-- Existing store products that match the list keep their own price; they only get pictures (if none) and their purchase cost recorded.
do $$ declare base int; begin select coalesce(max(sort),0) into base from public.store_products; 
insert into public.store_products (id,cat,name,ta,size,price,mrp,stock,description,details,cert,is_new,image_url,image_path,pack_type,tag,color,sort,active,organic,gallery) values
('white-sugar-1kg','millets','White Sugar','வெள்ளை சர்க்கரை','1 kg',70,105,null,'Fine white sugar for tea, coffee and sweets.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/white-sugar-1kg-1.webp',null,'pouch','WHITE','#F3EFE6',base+10,true,true,array['https://goalai.vercel.app/products/white-sugar-1kg-2.webp']),
('icing-sugar-1kg','millets','Icing Sugar','ஐசிங் சுகர்','1 kg',77,120,null,'Powdered sugar for cakes, frosting and sweets.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/icing-sugar-1kg-1.webp',null,'pouch','ICING','#F2B8D0',base+20,true,false,array['https://goalai.vercel.app/products/icing-sugar-1kg-2.webp']),
('peas-dhall-1kg','staples','Peas Dhall','பட்டாணி பருப்பு','1 kg',70,105,null,'Split yellow peas for sambar, vada and kootu.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/peas-dhall-1kg-1.webp',null,'pouch','PEAS','#D9B84A',base+30,true,true,array['https://goalai.vercel.app/products/peas-dhall-1kg-2.webp']),
('gram-dhall-1kg','staples','Gram Dhall','கடலைப்பருப்பு','1 kg',118,180,null,'Split Bengal gram (kadalai paruppu) for chutney, vada and sundal.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/gram-dhall-1kg-1.webp',null,'pouch','GRAM','#E0A526',base+40,true,true,array['https://goalai.vercel.app/products/gram-dhall-1kg-2.webp']),
('green-moong-1kg','staples','Green Moong','பச்சைப்பயறு','1 kg',132,200,null,'Whole green gram for sprouts, kuzhambu and sundal.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/green-moong-1kg-1.webp',null,'pouch','GREEN','#5E9B3F',base+50,true,true,array['https://goalai.vercel.app/products/green-moong-1kg-2.webp']),
('black-mysore-1kg','staples','Black Mysore','கருப்பு மைசூர் பருப்பு','1 kg',86,130,null,'Whole black masoor lentils, hearty and quick to cook.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/black-mysore-1kg-1.webp',null,'pouch','BLACK','#4A3A33',base+60,true,true,array['https://goalai.vercel.app/products/black-mysore-1kg-2.webp']),
('red-mysore-1kg','staples','Red Mysore','சிவப்பு மைசூர் பருப்பு','1 kg',96,145,null,'Split red lentils (masoor dal) that cook soft in minutes.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/red-mysore-1kg-1.webp',null,'pouch','RED','#D9623B',base+70,true,true,array['https://goalai.vercel.app/products/red-mysore-1kg-2.webp']),
('white-peas-1kg','staples','White Peas','வெள்ளை பட்டாணி','1 kg',70,105,null,'Dried white peas for sundal and ragda.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/white-peas-1kg-1.webp',null,'pouch','WHITE','#E9DFC3',base+80,true,true,array['https://goalai.vercel.app/products/white-peas-1kg-2.webp']),
('chick-peas-1kg','staples','Chick Peas','கொண்டைக்கடலை','1 kg',138,210,null,'Kabuli chana for sundal, channa masala and salads.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/chick-peas-1kg-1.webp',null,'pouch','CHICK','#D9A964',base+90,true,true,array['https://goalai.vercel.app/products/chick-peas-1kg-2.webp']),
('orid-dhall-1kg','staples','Orid Dhall','உளுந்தம் பருப்பு','1 kg',156,240,null,'Split white urad dal for idli, dosa and vada batter.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/orid-dhall-1kg-1.webp',null,'pouch','ORID','#F0E6CF',base+100,true,true,array['https://goalai.vercel.app/products/orid-dhall-1kg-2.webp']),
('sooji-1kg','staples','Sooji','ரவை','1 kg',56,85,null,'Fine rava for upma, kesari and rava dosa.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/sooji-1kg-1.webp',null,'pouch','SOOJI','#EBCB85',base+110,true,true,array['https://goalai.vercel.app/products/sooji-1kg-2.webp']),
('maida-1kg','staples','Maida','மைதா','1 kg',55,85,null,'All-purpose flour for parotta, bakery items and snacks.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/maida-1kg-1.webp',null,'pouch','MAIDA','#F1E8D8',base+120,true,false,array['https://goalai.vercel.app/products/maida-1kg-2.webp']),
('maize-starch-1kg','staples','Maize Starch','சோள மாவு','1 kg',59,90,null,'Corn flour for thickening gravies, soups and crispy fry.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/maize-starch-1kg-1.webp',null,'pouch','MAIZE','#F3E9B7',base+130,true,true,array['https://goalai.vercel.app/products/maize-starch-1kg-2.webp']),
('tapioca-flour-1kg','staples','Tapioca Flour','மரவள்ளி மாவு','1 kg',56,85,null,'Tapioca starch flour for snacks, puddings and thickening.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/tapioca-flour-1kg-1.webp',null,'pouch','TAPIOCA','#F0E8DA',base+140,true,true,array['https://goalai.vercel.app/products/tapioca-flour-1kg-2.webp']),
('peas-flour-1kg','staples','Peas Flour','பட்டாணி மாவு','1 kg',83,125,null,'Ground yellow peas flour for bajji, bonda and batter.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/peas-flour-1kg-1.webp',null,'pouch','PEAS','#E7D58A',base+150,true,true,array['https://goalai.vercel.app/products/peas-flour-1kg-2.webp']),
('rice-flour-1kg','staples','Rice Flour','அரிசி மாவு','1 kg',60,90,null,'Fine rice flour for murukku, idiyappam and kolam.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/rice-flour-1kg-1.webp',null,'pouch','RICE','#F6F0E3',base+160,true,true,array['https://goalai.vercel.app/products/rice-flour-1kg-2.webp']),
('salt-1kg','masala','Salt','உப்பு','1 kg',10,15,null,'Everyday cooking salt.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/salt-1kg-1.webp',null,'pouch','SALT','#9FB7D6',base+170,true,false,array['https://goalai.vercel.app/products/salt-1kg-2.webp']),
('crystal-salt-1kg','masala','Crystal Salt','படிக உப்பு','1 kg',10,15,null,'Crystal salt for daily cooking.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/crystal-salt-1kg-1.webp',null,'pouch','CRYSTAL','#B6C9E3',base+180,true,false,array['https://goalai.vercel.app/products/crystal-salt-1kg-2.webp']),
('rock-salt-1kg','masala','Rock Salt','இந்துப்பு','1 kg',16,25,null,'Rock salt (sendha namak / indhuppu) for cooking and fasting days.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/rock-salt-1kg-1.webp',null,'pouch','ROCK','#E3A6B8',base+190,true,true,array['https://goalai.vercel.app/products/rock-salt-1kg-2.webp']),
('flattened-rice-avul-1kg','staples','Flattened Rice (Avul)','அவல்','1 kg',82,125,null,'Poha / avul for upma, kesari and quick breakfasts.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/flattened-rice-avul-1kg-1.webp',null,'pouch','FLATTENED','#EFE2C0',base+200,true,true,array['https://goalai.vercel.app/products/flattened-rice-avul-1kg-2.webp']),
('ragi-1kg','millets','Ragi','கேழ்வரகு','1 kg',64,100,null,'Whole finger millet to grind for ragi malt, kali and dosa.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/ragi-1kg-1.webp',null,'pouch','RAGI','#8C4A3A',base+210,true,true,array['https://goalai.vercel.app/products/ragi-1kg-2.webp']),
('aroma-ghee-500g','oils','Aroma Ghee','நெய்','500 g',432,650,null,'Rich aromatic ghee for rice, sweets and tadka.','[["Pack size", "500 g"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/aroma-ghee-500g-1.webp',null,'jar','AROMA','#F2C230',base+220,true,true,array['https://goalai.vercel.app/products/aroma-ghee-500g-2.webp']),
('vendhayam-fenugreek-1kg','masala','Vendhayam (Fenugreek)','வெந்தயம்','1 kg',116,180,null,'Whole fenugreek seeds for sambar, pickles and methi water.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/vendhayam-fenugreek-1kg-1.webp',null,'pouch','VENDHAYAM','#D9A21F',base+230,true,true,array['https://goalai.vercel.app/products/vendhayam-fenugreek-1kg-2.webp']),
('jeeragam-cumin-250g','masala','Jeeragam (Cumin)','சீரகம்','250 g',93,140,null,'Whole cumin seeds for tadka, rasam and jeera water.','[["Pack size", "250 g"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/jeeragam-cumin-250g-1.webp',null,'pouch','JEERAGAM','#8F6B3A',base+240,true,true,array['https://goalai.vercel.app/products/jeeragam-cumin-250g-2.webp']),
('souf-seeds-fennel-250g','masala','Souf Seeds (Fennel)','சோம்பு','250 g',60,90,null,'Fennel seeds for masalas, biryani and after-meal mouth freshener.','[["Pack size", "250 g"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/souf-seeds-fennel-250g-1.webp',null,'pouch','SOUF','#8DAA5B',base+250,true,true,array['https://goalai.vercel.app/products/souf-seeds-fennel-250g-2.webp']),
('mustard-1kg','masala','Mustard','கடுகு','1 kg',138,210,null,'Small mustard seeds for tempering and pickles.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/mustard-1kg-1.webp',null,'pouch','MUSTARD','#3F2A22',base+260,true,true,array['https://goalai.vercel.app/products/mustard-1kg-2.webp']),
('rose-karamani-1kg','staples','Rose Karamani','சிவப்பு காராமணி','1 kg',144,220,null,'Red cow peas (karamani) for kuzhambu, sundal and salads.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/rose-karamani-1kg-1.webp',null,'pouch','ROSE','#B8502F',base+270,true,true,array['https://goalai.vercel.app/products/rose-karamani-1kg-2.webp']),
('white-karamani-1kg','staples','White Karamani','வெள்ளை காராமணி','1 kg',120,180,null,'White cow peas (karamani) for kuzhambu and sundal.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/white-karamani-1kg-1.webp',null,'pouch','WHITE','#EADFC4',base+280,true,true,array['https://goalai.vercel.app/products/white-karamani-1kg-2.webp']),
('mochai-1kg','staples','Mochai','மொச்சை','1 kg',120,180,null,'Dried field beans (mochai) for kuzhambu and kootu.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/mochai-1kg-1.webp',null,'pouch','MOCHAI','#C7B26B',base+290,true,true,array['https://goalai.vercel.app/products/mochai-1kg-2.webp']),
('palmolein-oil-1l','oils','Palmolein Oil','பாமாயில்','1 L',165,250,null,'Palmolein cooking oil, 1 litre.','[["Pack size", "1 L"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/palmolein-oil-1l-1.webp',null,'bottle','PALMOLEIN','#F0B429',base+300,true,false,array['https://goalai.vercel.app/products/palmolein-oil-1l-2.webp']),
('palmolein-oil-tin-15kg','oils','Palmolein Oil (Tin)','பாமாயில் டின்','15 kg',2670,4010,null,'Palmolein cooking oil in a 15 kg tin for hotels and bulk buyers.','[["Pack size", "15 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/palmolein-oil-tin-15kg-1.webp',null,'box','PALMOLEIN','#F0B429',base+310,true,false,array['https://goalai.vercel.app/products/palmolein-oil-tin-15kg-2.webp']),
('sunflower-oil-1l','oils','Sunflower Oil','சூரியகாந்தி எண்ணெய்','1 L',198,300,null,'Sunflower cooking oil, 1 litre.','[["Pack size", "1 L"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/sunflower-oil-1l-1.webp',null,'bottle','SUNFLOWER','#F5CB3C',base+320,true,false,array['https://goalai.vercel.app/products/sunflower-oil-1l-2.webp']),
('deepa-jothi-oil-1l','fancy','Deepa Jothi Oil','தீப ஜோதி எண்ணெய்','1 L',210,320,null,'Pooja lamp oil for diyas and deepam. Not for cooking or eating.','[["Pack size", "1 L"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/deepa-jothi-oil-1l-1.webp',null,'bottle','DEEPA','#E07A2B',base+330,true,false,array['https://goalai.vercel.app/products/deepa-jothi-oil-1l-2.webp']),
('mustard-oil-1l','oils','Mustard Oil','கடுகு எண்ணெய்','1 L',246,370,null,'Mustard oil, 1 litre, for pickles and cooking.','[["Pack size", "1 L"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/mustard-oil-1l-1.webp',null,'bottle','MUSTARD','#D49A12',base+340,true,false,array['https://goalai.vercel.app/products/mustard-oil-1l-2.webp']),
('dalda-vanaspati-1kg','oils','Dalda Vanaspati','டால்டா','1 kg',168,260,null,'Vanaspati for sweets and bakery items, 1 kg box.','[["Pack size", "1 kg"], ["Storage", "Store in a cool, dry place"]]'::jsonb,'',false,'https://goalai.vercel.app/products/dalda-vanaspati-1kg-1.webp',null,'box','DALDA','#E5B93C',base+350,true,false,array['https://goalai.vercel.app/products/dalda-vanaspati-1kg-2.webp'])
on conflict (id) do nothing;
update public.store_products set image_url='https://goalai.vercel.app/products/toordal-1.webp', gallery=array['https://goalai.vercel.app/products/toordal-2.webp'] where id='toordal' and image_url is null and cardinality(gallery)=0;
update public.store_products set image_url='https://goalai.vercel.app/products/moongdal-1.webp', gallery=array['https://goalai.vercel.app/products/moongdal-2.webp'] where id='moongdal' and image_url is null and cardinality(gallery)=0;
update public.store_products set image_url='https://goalai.vercel.app/products/atta-1.webp', gallery=array['https://goalai.vercel.app/products/atta-2.webp'] where id='atta' and image_url is null and cardinality(gallery)=0;
update public.store_products set gallery=array['https://goalai.vercel.app/products/cashew-1.webp','https://goalai.vercel.app/products/cashew-2.webp'] where id='cashew' and cardinality(gallery)=0;
update public.store_products set gallery=array['https://goalai.vercel.app/products/almond-1.webp','https://goalai.vercel.app/products/almond-2.webp'] where id='almond' and cardinality(gallery)=0;
update public.store_products set gallery=array['https://goalai.vercel.app/products/pista-1.webp','https://goalai.vercel.app/products/pista-2.webp'] where id='pista' and cardinality(gallery)=0;
update public.store_products set image_url='https://goalai.vercel.app/products/raisins-1.webp', gallery=array['https://goalai.vercel.app/products/raisins-2.webp'] where id='raisins' and image_url is null and cardinality(gallery)=0;
update public.store_products set image_url='https://goalai.vercel.app/products/gingelly-1.webp', gallery=array['https://goalai.vercel.app/products/gingelly-2.webp'] where id='gingelly' and image_url is null and cardinality(gallery)=0;
insert into public.store_product_costs (product_id,cost) values
('white-sugar-1kg',58),
('icing-sugar-1kg',64),
('peas-dhall-1kg',58),
('gram-dhall-1kg',98),
('green-moong-1kg',110),
('black-mysore-1kg',71),
('red-mysore-1kg',80),
('white-peas-1kg',58),
('chick-peas-1kg',115),
('orid-dhall-1kg',130),
('sooji-1kg',46.5),
('maida-1kg',45.2),
('maize-starch-1kg',49),
('tapioca-flour-1kg',46),
('peas-flour-1kg',69),
('rice-flour-1kg',50),
('salt-1kg',7.6),
('crystal-salt-1kg',7.6),
('rock-salt-1kg',13),
('flattened-rice-avul-1kg',68),
('ragi-1kg',53),
('aroma-ghee-500g',360.0),
('vendhayam-fenugreek-1kg',96),
('jeeragam-cumin-250g',77.5),
('souf-seeds-fennel-250g',50.0),
('mustard-1kg',115),
('rose-karamani-1kg',120),
('white-karamani-1kg',100),
('mochai-1kg',100),
('palmolein-oil-1l',137),
('palmolein-oil-tin-15kg',2225),
('sunflower-oil-1l',165),
('deepa-jothi-oil-1l',175),
('mustard-oil-1l',205),
('dalda-vanaspati-1kg',140),
('toordal',158),
('moongdal',58.0),
('atta',190),
('cashew',237.5),
('almond',295.0),
('pista',700.0),
('raisins',135.0),
('gingelly',135.0)
on conflict (product_id) do update set cost=excluded.cost, updated_at=now();
end $$;
