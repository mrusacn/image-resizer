# 清晰改图

一个纯前端图片尺寸调整工具。用户可以在浏览器本地上传图片，设置目标宽高，选择完整留白、填满裁切或拉伸铺满，然后导出 PNG、JPG 或 WebP。

## 功能

- 上传或拖入图片
- 支持单张或多张图片
- 放大或缩小到指定像素尺寸
- 可保持原图比例
- 常用规格快捷按钮：一寸照、二寸照、小二寸、身份证、护照、签证照、头像、方图、横版、竖版
- 原图和输出结果对比预览
- 填满裁切时可选择九宫格裁切位置
- 可设置 DPI：72、96、150、300、350
- 可压缩到指定文件大小：200KB、500KB、1MB 或自定义
- PNG 无损、JPG 高质量、WebP 导出
- 手机端提供相册保存预览，iPhone Chrome 可长按图片保存到照片
- 多张图片可批量导出为 ZIP
- 全程在浏览器本地处理，图片不会上传到服务器

## 本地打开

直接用浏览器打开 `index.html`。

## 部署到 Cloudflare Pages

这是静态网站，不需要安装依赖，也不需要构建命令。

Cloudflare Pages 设置：

- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`
- Root directory: `/`

如果仓库里只放这个项目文件夹，并且 `index.html` 在仓库根目录，上面设置即可。

## 更新网站

修改文件后，把 `index.html`、`styles.css`、`app.js`、`README.md`、`_headers`、`.gitignore` 上传到 GitHub 仓库根目录。Cloudflare Pages 会自动重新部署。
