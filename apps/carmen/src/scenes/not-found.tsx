import { FileX2, List, SearchX } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { Link, useMatch } from 'react-router-dom'

import AppLink from 'src/components/AppLink'

const Wrapper = ({ children }: PropsWithChildren) => {
  return <div className="flex flex-col gap-4 w-full justify-center items-center">{children}</div>
}

const NotFoundHeader = ({ children }: PropsWithChildren) => {
  return <h1 className="text-2xl font-semibold text-center">{children}</h1>
}

const NotFoundDescription = ({ children }: PropsWithChildren) => {
  return <p className="text-md">{children}</p>
}

function NotFound() {
  if (useMatch('/invites/:id')) {
    return (
      <Wrapper>
        <SearchX size={100} className="text-slate-700" />
        <NotFoundHeader>This invite could not be found.</NotFoundHeader>
        <NotFoundDescription>Sign up to start making lists with friends!</NotFoundDescription>
        <AppLink btn to="/signup">
          Go to list
        </AppLink>
      </Wrapper>
    )
  }

  if (useMatch('/invites')) {
    return (
      <Wrapper>
        <List size={100} className="text-slate-700" />
        <NotFoundHeader>Sign up to start making lists with friends!</NotFoundHeader>
        <NotFoundDescription>
          If someone invited you to a list,{' '}
          <Link to="/login" className="text-blue-400 font-semibold">
            log in
          </Link>{' '}
          to view your new list.
        </NotFoundDescription>
        <AppLink btn to="/signup">
          Go to list
        </AppLink>
      </Wrapper>
    )
  }

  if (useMatch('/list/:id')) {
    return (
      <Wrapper>
        <FileX2 size={100} className="text-slate-700" />

        <NotFoundHeader>This list could not be found.</NotFoundHeader>

        <NotFoundDescription>
          If you think this is a mistake,{' '}
          <Link to="/login" className="text-blue-400 font-semibold">
            log in
          </Link>{' '}
          to view your lists.
        </NotFoundDescription>

        <AppLink btn to="/signup">
          Go to list
        </AppLink>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <SearchX size={100} className="text-slate-700" />
      <NotFoundHeader>What are you looking for? We can't find it.</NotFoundHeader>
      <AppLink btn to="/login" className="font-semibold">
        Log in
      </AppLink>
    </Wrapper>
  )
}

export default NotFound
