import { prerenderToNodeStream } from 'react-dom/static';

export type TRenderToStatic = (children: React.ReactNode) => Promise<string>

const renderToStatic: TRenderToStatic = async (children: React.ReactNode) => {
    const controller = new AbortController();

    return new Promise((resolve, reject) => {
        prerenderToNodeStream(children, {
            signal: controller.signal,
        }).then(({ prelude }) => {
            prelude.setEncoding('utf8');
            let data = '';
            prelude.on('data', chunk => {
                data += chunk;
            });
            prelude.on('end', () => resolve(data));
            prelude.on('error', reject);
        }).catch(reject);
    });
}

export default renderToStatic