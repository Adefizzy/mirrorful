import '../main.css'
import '../atom-one-dark.css'

import { ChakraProvider } from '@chakra-ui/react'
import { Onboarding } from '@mirrorful/core/lib/components/Onboarding'
import SplashScreen from '@mirrorful/core/lib/components/SplashScreen'
import { MirrorfulThemeProvider } from '@mirrorful/core/lib/components/ThemeProvider'
import useMirrorfulStore, {
  MirrorfulState,
} from '@mirrorful/core/lib/store/useMirrorfulStore'
import { defaultShadows } from '@mirrorful/core/lib/types'
import type { AppProps } from 'next/app'
import { usePathname, useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LayoutWrapper } from 'src/components/LayoutWrapper'

import { fetchStoreData } from '../utils/fetchStoreData'
import { postStoreData } from '../utils/postStoreData'

if (typeof window !== 'undefined') {
  // This ensures that as long as we are client-side, posthog is always ready
  posthog.init('phc_Fi1SAV5Xhkmrf5VwIweTTmZDNnUIWmXkvXr7naLsNVV', {
    api_host: 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing()
    },
  })
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [shouldForceSkipOnboarding, setShouldForceSkipOnboarding] =
    useState(false)
  const [showOnBoarding, setShowOnBoarding] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const oldPathname = useRef<string>('')

  const { setColors, setTypography, setShadows, setFileTypes } =
    useMirrorfulStore((state: MirrorfulState) => state)

  // to fetch data
  const timeout = useRef<NodeJS.Timeout | null>(null)
  const fetchStoredData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetchStoreData()

      if (
        !Object.keys(data).length ||
        !data.tokens.colorData ||
        data.tokens.colorData.length === 0
      ) {
        setShowOnBoarding(true)
        return
      }

      setColors(data.tokens.colorData ?? [])
      setTypography(data.tokens.typography)
      setShadows(data.tokens.shadows ?? defaultShadows)
      setFileTypes(data.files)
    } catch (e) {
      // TODO: Handle error
    } finally {
      timeout.current = setTimeout(() => {
        setIsLoading(false)
      }, 1250)
    }
  }, [setColors, setFileTypes, setShadows, setShowOnBoarding, setTypography])

  useEffect(() => {
    // only initial render assign pathname
    oldPathname.current = pathname
  }, [])

  useEffect(() => {
    // on initial load
    fetchStoredData()
  }, [fetchStoredData])

  useEffect(() => {
    // Track page views
    if (oldPathname.current !== pathname) {
      oldPathname.current = pathname
      posthog.capture('$pageview')
    }
    // const handleRouteChange = () => {
    //   posthog.capture('$pageview')
    // }

    // router.events.on('routeChangeComplete', handleRouteChange)

    // return () => {
    //   router.events.off('routeChangeComplete', handleRouteChange)
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    router.prefetch('/colors')
    router.prefetch('/typography')
    router.prefetch('/shadows')
  }, [router])

  useEffect(() => {
    if (!showOnBoarding && shouldForceSkipOnboarding) {
      fetchStoredData()
    }
  }, [fetchStoredData, shouldForceSkipOnboarding, showOnBoarding])

  return (
    <MirrorfulThemeProvider>
      {isLoading && <SplashScreen />}
      {!shouldForceSkipOnboarding && showOnBoarding ? (
        <Onboarding
          postStoreData={postStoreData}
          onFinishOnboarding={() => {
            setShowOnBoarding(false)
            setShouldForceSkipOnboarding(true)
          }}
          platform={'package'}
        />
      ) : (
        <LayoutWrapper>
          <Component {...pageProps} />
        </LayoutWrapper>
      )}
    </MirrorfulThemeProvider>
  )
}
