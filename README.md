# 清晰改图

一个纯前端图片尺寸调整工具。用户可以在浏览器本地上传图片，设置目标宽高，选择完整留白、填满裁切或拉伸铺满，然后导出 PNG、JPG 或 WebP。

## 功能

- 上传或拖入图片
- 放大或缩小到指定像素尺寸
- 可保持原图比例
- 常用规格快捷按钮
- PNG 无损、JPG 高质量、WebP 导出
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
