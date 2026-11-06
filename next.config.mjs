/** @type {import('next').NextConfig} */
const nextConfig = {
  // The AI embedding library must run on the server as a normal Node package
  serverExternalPackages: ['@huggingface/transformers'],
};
export default nextConfig;
