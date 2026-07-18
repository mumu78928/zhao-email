import iconv from 'iconv-lite';
import iconvEncodings from 'iconv-lite/encodings';

// 在任何模块使用 iconv-lite 之前，预先加载所有编码表
// 这是为了修复 esbuild 打包后懒加载 require("../encodings") 失效的问题
(iconv as any).encodings = iconvEncodings;
iconv.encodingExists('utf8');
iconv.encodingExists('gbk');
iconv.encodingExists('gb2312');
iconv.encodingExists('gb18030');
iconv.encodingExists('big5');
iconv.encodingExists('shiftjis');
iconv.encodingExists('eucjp');
iconv.encodingExists('euckr');
