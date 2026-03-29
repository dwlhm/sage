import { prerenderToNodeStream } from 'react-dom/static';

export type TRenderToStatic = (children: React.ReactNode) => Promise<string>

export const renderToStatic: TRenderToStatic = async (children: React.ReactNode) => new Promise((resolve, reject) => {
    prerenderToNodeStream(children).then(({ prelude }) => {
        let data = '';
        prelude.setEncoding('utf8');
        prelude.on('data', chunk => {
            data += chunk;
        });
        prelude.on('end', () => resolve(data));
        prelude.on('error', reject);
    }).catch(reject);
});